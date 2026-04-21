const { getSupabaseAdmin } = require('../lib/supabase');
const { normalizePixFields } = require('../lib/pix-normalize');
const crypto = require('crypto');

async function createPixCharge(req, res) {
  try {
    const {
      nome, whatsapp, email, cpf_cnpj, cep, endereco, numero,
      complemento, bairro, cidade, estado, tamanho, quantidade,
      valor_unitario, observacoes, page_slug, whatsapp_number_id,
    } = req.body;

    // Validação
    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, whatsapp, tamanho, valor_unitario'
      });
    }

    const qtd = quantidade || 1;
    const valor_total = valor_unitario * qtd;
    const amount = Math.round(valor_total * 100); // centavos

    const FASTSOFT_SECRET_KEY = process.env.FASTSOFT_SECRET_KEY;
    if (!FASTSOFT_SECRET_KEY) {
      throw new Error('FASTSOFT_SECRET_KEY not configured');
    }

    // FastSoft Basic Auth: base64("x:<secret_key>")
    const tokenBase64 = Buffer.from(`x:${FASTSOFT_SECRET_KEY}`).toString('base64');

    // Ref única do pedido
    const orderRef = crypto.randomUUID().slice(0, 8);

    // Documento limpo
    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');
    const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';

    // Postback FastSoft: URL pública acessível por eles (produção ou túnel ngrok/localtunnel).
    // Prioridade: FASTSOFT_POSTBACK_URL → função Supabase → API Node local.
    const explicitPostback = (process.env.FASTSOFT_POSTBACK_URL || '').trim();
    const supabaseBase = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    let webhookUrl;
    if (explicitPostback) {
      webhookUrl = explicitPostback;
    } else if (supabaseBase) {
      webhookUrl = `${supabaseBase}/functions/v1/fastsoft-webhook`;
    } else {
      webhookUrl = `http://localhost:${process.env.PORT || 3001}/api/fastsoft-webhook`;
    }

    // Payload FastSoft
    const payload = {
      amount,
      paymentMethod: 'PIX',
      customer: {
        name: nome,
        email: email || `${whatsapp.replace(/\D/g, '')}@noemail.com`,
        document: {
          number: cleanDoc || '00000000000',
          type: docType,
        },
        phone: whatsapp.replace(/\D/g, ''),
        externaRef: `cli_${orderRef}`,
      },
      shipping: {
        fee: 0,
        address: {
          street: endereco || '',
          streetNumber: numero || '',
          complement: complemento || '',
          zipCode: (cep || '').replace(/\D/g, ''),
          neighborhood: bairro || '',
          city: cidade || '',
          state: estado || '',
          country: 'br',
        },
      },
      items: [{
        title: `Entulho Hoje — Caçamba ${tamanho} x${qtd}`,
        unitPrice: amount,
        quantity: 1,
        tangible: false,
        externalRef: `ped_${orderRef}`,
      }],
      postbackUrl: webhookUrl,
      metadata: {
        order_ref: orderRef,
      },
      traceable: true,
      pix: {
        expiresInDays: 1,
      },
    };

    const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const clientIp = fwd || req.socket?.remoteAddress || '';
    if (clientIp) {
      payload.ip = clientIp.replace(/^::ffff:/, '');
    }

    // Chamar FastSoft API
    const response = await fetch('https://api.fastsoftbrasil.com/api/user/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${tokenBase64}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('FastSoft error:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Erro ao gerar cobrança PIX',
        details: data,
      });
    }

    let txData = data.data;

    // Buscar a transação criada para garantir que aparece no painel FastSoft
    if (txData?.id) {
      try {
        const getTxRes = await fetch(`https://api.fastsoftbrasil.com/api/user/transactions/${txData.id}`, {
          headers: {
            'Authorization': `Basic ${tokenBase64}`,
            'Accept': 'application/json',
          },
        });
        if (getTxRes.ok) {
          const getTxData = await getTxRes.json();
          if (getTxData?.data) txData = getTxData.data;
          console.log('FastSoft transaction confirmed:', txData.id);
        }
      } catch (fetchErr) {
        console.warn('FastSoft GET transaction warning:', fetchErr.message);
      }
    }
    const pixNorm = normalizePixFields(txData);

    // Salvar pedido no banco
    const supabase = getSupabaseAdmin();

    const slug = page_slug ? String(page_slug).trim().slice(0, 80) : null;

    let resolvedWhatsappNumberId = null;
    const widRaw = whatsapp_number_id != null ? String(whatsapp_number_id).trim() : '';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(widRaw)) {
      const { data: wn } = await supabase.from('whatsapp_numbers').select('id').eq('id', widRaw).maybeSingle();
      if (wn?.id) resolvedWhatsappNumberId = wn.id;
    }

    // Fallback: se não temos número (cliente não clicou no WhatsApp),
    // atribuir ao número activo actual na rotação.
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
      fastsoft_transaction_id: txData?.id || null,
      fastsoft_external_ref: `ped_${orderRef}`,
      pix_qr_code: pixNorm.pix_qr_code,
      pix_qr_code_url: pixNorm.pix_qr_code_url,
      pix_copy_paste: pixNorm.pix_copy_paste,
      pix_expires_at: txData?.pix?.expirationDate || new Date(Date.now() + 86400000).toISOString(),
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
      expires_at: txData?.pix?.expirationDate || null,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { createPixCharge };
