const { getSupabaseAdmin } = require('../lib/supabase');

const PUSHCUT_URL = 'https://api.pushcut.io/G7TVP0BQZvdZeVlNdxBpM/notifications/Oferta%201';

async function notifyPushcut({ title, message, amount }) {
  try {
    const body = {
      title,
      text: message,
    };
    if (amount) body.sound = 'cash';
    await fetch(PUSHCUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('Pushcut notificado:', title, message);
  } catch (e) {
    console.error('Pushcut erro:', e.message);
  }
}

function fmtBrl(centavos) {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}

async function fastsoftWebhook(req, res) {
  try {
    const body = req.body;
    console.log('FastSoft Webhook received:', JSON.stringify(body));

    const transactionData = body.data;

    if (transactionData && transactionData.status?.toUpperCase() === 'PAID') {
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

      // Dados para a notificação
      const nome   = transactionData.items?.[0]?.title
                  || transactionData.customer?.name
                  || 'Cliente';
      const valor  = transactionData.fee?.netAmount ?? transactionData.amount ?? 0;
      const bruto  = transactionData.amount ?? 0;

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

      // Notifica Pushcut
      await notifyPushcut({
        title: 'Venda Aprovada no Pix',
        message: `Valor ${fmtBrl(bruto)}`,
        amount: bruto,
      });
    }

    return res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { fastsoftWebhook };
