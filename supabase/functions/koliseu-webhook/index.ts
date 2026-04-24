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
    console.log('Koliseu Webhook received:', JSON.stringify(body));

    const payment = (body as any).data ?? (body as any).payment ?? body;
    const status = ((payment?.status as string) || '').toUpperCase();
    const paymentId = payment?.id;

    if (paymentId && (status === 'PAID' || status === 'APPROVED' || status === 'COMPLETED')) {
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
        .eq('koliseu_payment_id', paymentId);

      if (error) {
        console.error('DB update error:', error);
        throw error;
      }

      console.log('Order updated to paid for koliseu_payment_id:', paymentId);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
