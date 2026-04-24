import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KOLISEU_BASE = "https://www.koliseu.cloud";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      nome, whatsapp, email, cpf_cnpj, tamanho, quantidade,
      valor_unitario, observacoes,
    } = await req.json();

    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: nome, whatsapp, tamanho, valor_unitario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qtd = quantidade || 1;
    const valor_total = valor_unitario * qtd;
    const amountCents = Math.round(valor_total * 100);

    const KOLISEU_API_KEY = Deno.env.get('KOLISEU_API_KEY');
    if (!KOLISEU_API_KEY) throw new Error('KOLISEU_API_KEY not configured');

    const orderRef = crypto.randomUUID().slice(0, 8);
    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');

    const supabaseBase = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
    const webhookUrl = `${supabaseBase}/functions/v1/koliseu-webhook`;

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

    const response = await fetch(`${KOLISEU_BASE}/api/v1/pix/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KOLISEU_API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Koliseu response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Koliseu error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar cobrança PIX', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const txData = (data as any).data ?? (data as any).payment ?? data;
    const paymentId = txData?.id ?? null;

    // Extrai campos PIX
    const pix = txData?.pix || {};
    const pixCode =
      txData?.pixCode ?? txData?.pixCopyPaste ?? txData?.copyPaste ??
      txData?.brCode ?? pix.qrcode ?? pix.copyPaste ?? null;
    const pixQr = txData?.pixQrCode ?? txData?.qrCodeBase64 ?? pix.qrcode ?? null;
    const expiresAt =
      txData?.expiresAt ?? txData?.expiration ?? pix.expiresAt ??
      pix.expirationDate ?? new Date(Date.now() + 86400000).toISOString();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: dbError } = await supabase.from('orders').insert({
      nome,
      whatsapp,
      email: email || '',
      cpf_cnpj: cpf_cnpj || '',
      tamanho,
      quantidade: qtd,
      valor_unitario,
      valor_total,
      forma_pagamento: 'pix',
      status: 'aguardando_pagamento',
      payment_status: 'pending',
      koliseu_payment_id: paymentId,
      pix_qr_code: pixQr || pixCode || null,
      pix_qr_code_url: null,
      pix_copy_paste: pixCode || null,
      pix_expires_at: expiresAt,
      observacoes: observacoes || '',
    }).select().single();

    if (dbError) {
      console.error('DB error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        pix_qr_code: pixQr || pixCode || null,
        pix_copy_paste: pixCode || null,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
