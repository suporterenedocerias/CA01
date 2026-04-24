const { getSupabaseAdmin } = require('../lib/supabase');

const PUSHCUT_URL = 'https://api.pushcut.io/G7TVP0BQZvdZeVlNdxBpM/notifications/Oferta%201';

async function notifyPushcut({ title, message, amount }) {
  try {
    const body = { title, text: message };
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

async function koliseuWebhook(req, res) {
  try {
    const body = req.body;
    console.log('Koliseu Webhook received:', JSON.stringify(body));

    // Suporta { data: {...} } ou root direto
    const payment = body.data ?? body.payment ?? body;

    const status = (payment?.status || '').toUpperCase();
    const paymentId = payment?.id;

    if (paymentId && (status === 'PAID' || status === 'APPROVED' || status === 'COMPLETED')) {
      const supabase = getSupabaseAdmin();

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

      const bruto = payment?.amountCents ?? payment?.amount ?? 0;
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

module.exports = { koliseuWebhook };
