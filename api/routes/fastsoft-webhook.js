const { getSupabaseAdmin } = require('../lib/supabase');

async function fastsoftWebhook(req, res) {
  try {
    const body = req.body;
    console.log('FastSoft Webhook received:', JSON.stringify(body));

    const transactionData = body.data;

    if (transactionData && transactionData.status === 'PAID') {
      // Parse metadata (pode vir como string)
      let metadata = {};
      try {
        metadata = typeof transactionData.metadata === 'string'
          ? JSON.parse(transactionData.metadata)
          : transactionData.metadata;
      } catch (e) {
        console.error('Metadata parse error:', e);
      }

      const transactionId = transactionData.id;

      if (transactionId) {
        const supabase = getSupabaseAdmin();

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

    return res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { fastsoftWebhook };
