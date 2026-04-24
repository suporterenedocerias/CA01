const { getSupabaseAdmin } = require('../lib/supabase');
const { normalizePixFields } = require('../lib/pix-normalize');
const crypto = require('crypto');

const KOLISEU_BASE = 'https://www.koliseu.cloud';

async function createPixCharge(req, res) {
  try {
    const {
      nome, whatsapp, email, cpf_cnpj, cep, endereco, numero,
      complemento, bairro, cidade, estado, tamanho, quantidade,
      valor_unitario, observacoes, page_slug, whatsapp_number_id,
      custom_page_slug,
    } = req.body;

    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, whatsapp, tamanho, valor_unitario'
      });
    }

    const qtd = quantidade || 1;
    const valor_total = valor_unitario * qtd;
    const amountCents = Math.round(valor_total * 100);

    // Buscar chave da página customizada (se informado)
    let koliseuKey = process.env.KOLISEU_API_KEY;
    if (custom_page_slug) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: pageGw } = await supabaseAdmin
          .from('custom_pages')
          .select('gateway_type, gateway_sk')
          .eq('slug', String(custom_page_slug).trim())
          .maybeSingle();
        if (pageGw?.gateway_sk) {
          koliseuKey = pageGw.gateway_sk;
          console.log(`[gateway] usando chave da página "${custom_page_slug}"`);
        }
      } catch (e) {
        console.warn('[gateway] erro ao buscar config da página:', e.message);
      }
    }

    if (!koliseuKey) throw new Error('KOLISEU_API_KEY not configured');

    const orderRef = crypto.randomUUID().slice(0, 8);
    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');

    // URL do webhook Koliseu
    const explicitWebhook = (process.env.KOLISEU_WEBHOOK_URL || '').trim();
    const supabaseBase = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    let webhookUrl;
    if (explicitWebhook) {
      webhookUrl = explicitWebhook;
    } else if (supabaseBase) {
      webhookUrl = `${supabaseBase}/functions/v1/koliseu-webhook`;
    } else {
      webhookUrl = `http://localhost:${process.env.PORT || 3001}/api/koliseu-webhook`;
    }

    // Payload Koliseu
    const payload = {
      amountCents,
      description: `Caçamba ${tamanho} x${qtd}`,
      externalReference: `ped_${orderRef}`,
      client: {
        name: nome,
        email: email || `${whatsapp.replace(/\D/g, '')}@noemail.com`,
        phone: whatsapp.replace(/\D/g, ''),
        document: cleanDoc || '00000000000',
      },
      webhookUrl,
    };

    // Chamar Koliseu API
    const response = await fetch(`${KOLISEU_BASE}/api/v1/pix/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': koliseuKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Koliseu response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Koliseu error:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Erro ao gerar cobrança PIX',
        details: data,
      });
    }

    // Suporta { data: {...} }, { payment: {...} } ou root direto
    const txData = data.data ?? data.payment ?? data;
    const pixNorm = normalizePixFields(txData);

    // Salvar pedido no banco
    const supabase = getSupabaseAdmin();

    const slug = custom_page_slug
      ? String(custom_page_slug).trim().slice(0, 80)
      : page_slug ? String(page_slug).trim().slice(0, 80) : null;

    let resolvedWhatsappNumberId = null;
    const widRaw = whatsapp_number_id != null ? String(whatsapp_number_id).trim() : '';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(widRaw)) {
      const { data: wn } = await supabase.from('whatsapp_numbers').select('id').eq('id', widRaw).maybeSingle();
      if (wn?.id) resolvedWhatsappNumberId = wn.id;
    }

    if (!resolvedWhatsappNumberId) {
      try {
        const [settingsRes, numbersRes] = await Promise.all([
          supabase.from('site_settings').select('whatsapp_new_visitor_seq, whatsapp_rotate_every').order('created_at').limit(1).single(),
          supabase.from('whatsapp_numbers').select('id, order_index').eq('active', true).order('order_index').order('created_at'),
        ]);
        const nums = numbersRes.data || [];
        if (nums.length > 0 && settingsRes.data) {
          const seq = Number(settingsRes.data.whatsapp_new_visitor_seq || 0);
          const rotateEvery = Math.max(1, Number(settingsRes.data.whatsapp_rotate_every || 5));
          const slot = Math.floor(seq / rotateEvery) % nums.length;
          resolvedWhatsappNumberId = nums[slot]?.id || nums[0].id;
        } else if (nums.length > 0) {
          resolvedWhatsappNumberId = nums[0].id;
        }
      } catch (e) {
        console.warn('Fallback whatsapp_number_id falhou:', e.message);
      }
    }

    const expiresAt =
      txData?.expiresAt ??
      txData?.expiration ??
      txData?.pix?.expiresAt ??
      txData?.pix?.expirationDate ??
      new Date(Date.now() + 86400000).toISOString();

    const { data: order, error: dbError } = await supabase.from('orders').insert({
      nome,
      whatsapp,
      email: email || '',
      cpf_cnpj: cpf_cnpj || '',
      cep: cep || '',
      endereco: endereco || '',
      numero: numero || '',
      complemento: complemento || '',
      bairro: bairro || '',
      cidade: cidade || '',
      estado: estado || '',
      tamanho,
      quantidade: qtd,
      valor_unitario,
      valor_total,
      forma_pagamento: 'pix',
      status: 'aguardando_pagamento',
      payment_status: 'pending',
      koliseu_payment_id: txData?.id || null,
      pix_qr_code: pixNorm.pix_qr_code,
      pix_qr_code_url: pixNorm.pix_qr_code_url,
      pix_copy_paste: pixNorm.pix_copy_paste,
      pix_expires_at: expiresAt,
      observacoes: observacoes || '',
      ...(slug ? { page_slug: slug } : {}),
      ...(resolvedWhatsappNumberId ? { whatsapp_number_id: resolvedWhatsappNumberId } : {}),
    }).select().single();

    if (dbError) {
      console.error('DB error:', dbError);
      throw dbError;
    }

    return res.json({
      order_id: order.id,
      pix_qr_code: pixNorm.pix_qr_code,
      pix_qr_code_url: pixNorm.pix_qr_code_url,
      pix_copy_paste: pixNorm.pix_copy_paste,
      expires_at: expiresAt,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { createPixCharge };
