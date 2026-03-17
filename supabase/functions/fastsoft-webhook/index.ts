import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('FastSoft Webhook received:', JSON.stringify(body));

    const transactionData = body.data;

    if (transactionData && transactionData.status === 'PAID') {
      // Parse metadata (may come as string)
      let metadata: any = {};
      try {
        metadata = typeof transactionData.metadata === 'string'
          ? JSON.parse(transactionData.metadata)
          : transactionData.metadata;
      } catch (e) {
        console.error('Metadata parse error:', e);
      }

      const transactionId = transactionData.id;

      if (transactionId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'pago',
            paid_at: new Date().toISOString(),
          })
          .eq('fastsoft_transaction_id', transactionId);

        if (error) {
          console.error('DB update error:', error);
          throw error;
        }

        console.log('Order updated to paid for transaction:', transactionId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
