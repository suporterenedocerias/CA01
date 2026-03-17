import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, whatsapp, email, cpf_cnpj, cep, endereco, numero, complemento, bairro, cidade, estado, tamanho, quantidade, valor_unitario, observacoes } = await req.json();

    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome, whatsapp, tamanho, valor_unitario' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const qtd = quantidade || 1;
    const valor_total = valor_unitario * qtd;
    const amount = Math.round(valor_total * 100); // centavos

    const FASTSOFT_SECRET_KEY = Deno.env.get('FASTSOFT_SECRET_KEY');
    if (!FASTSOFT_SECRET_KEY) {
      throw new Error('FASTSOFT_SECRET_KEY not configured');
    }

    // FastSoft Basic Auth: base64("x:<secret_key>")
    const authString = `x:${FASTSOFT_SECRET_KEY}`;
    const tokenBase64 = base64Encode(new TextEncoder().encode(authString));

    // Generate a unique order ref
    const orderRef = crypto.randomUUID().slice(0, 8);

    // Clean document
    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');
    const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';

    // Build FastSoft payload
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
        title: `Caçamba ${tamanho} x${qtd}`,
        unitPrice: amount,
        quantity: 1,
        tangible: false,
        externalRef: `ped_${orderRef}`,
      }],
      postbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/fastsoft-webhook`,
      metadata: {
        order_ref: orderRef,
      },
      traceable: true,
      pix: {
        expiresInDays: 1,
      },
    };

    // Call FastSoft API
    const response = await fetch('https://api.fastsoftbrasil.com/api/user/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${tokenBase64}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('FastSoft error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Erro ao gerar cobrança PIX', details: data }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const txData = data.data;

    // Save order to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      pix_qr_code: txData?.pix?.qrcode || null,
      pix_qr_code_url: null,
      pix_copy_paste: txData?.pix?.qrcode || txData?.pix?.url || null,
      pix_expires_at: txData?.pix?.expirationDate || new Date(Date.now() + 86400000).toISOString(),
      observacoes: observacoes || '',
    }).select().single();

    if (dbError) {
      console.error('DB error:', dbError);
      throw dbError;
    }

    return new Response(JSON.stringify({
      order_id: order.id,
      pix_qr_code: txData?.pix?.qrcode || null,
      pix_copy_paste: txData?.pix?.qrcode || txData?.pix?.url || null,
      expires_at: txData?.pix?.expirationDate || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
