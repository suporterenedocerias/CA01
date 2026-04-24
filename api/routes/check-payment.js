const { getSupabaseAdmin } = require('../lib/supabase');

const KOLISEU_BASE = 'https://www.koliseu.cloud';

async function checkPayment(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: 'orderId obrigatório' });

    const supabase = getSupabaseAdmin();
    const { data: order, error: dbErr } = await supabase
      .from('orders')
      .select('id, koliseu_payment_id, payment_status')
      .eq('id', orderId)
      .single();

    if (dbErr || !order) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (order.payment_status === 'paid') return res.json({ status: 'paid', updated: false });
    if (!order.koliseu_payment_id) return res.status(400).json({ error: 'Sem ID de pagamento Koliseu' });

    const KOLISEU_API_KEY = process.env.KOLISEU_API_KEY;
    if (!KOLISEU_API_KEY) throw new Error('KOLISEU_API_KEY not configured');

    const txRes = await fetch(
      `${KOLISEU_BASE}/api/v1/pix/payments/${order.koliseu_payment_id}`,
      {
        headers: {
          'x-api-key': KOLISEU_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!txRes.ok) {
      const errData = await txRes.json().catch(() => ({}));
      console.error('Koliseu check error:', errData);
      return res.status(502).json({ error: 'Erro ao consultar Koliseu', details: errData });
    }

    const txData = await txRes.json();
    const tx = txData.data ?? txData.payment ?? txData;
    const txStatus = (tx.status || '').toUpperCase();

    console.log(`Check payment order=${orderId} koliseu_id=${order.koliseu_payment_id} status=${txStatus}`);

    if (txStatus === 'PAID' || txStatus === 'APPROVED' || txStatus === 'COMPLETED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'pago',
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return res.json({ status: 'paid', updated: true });
    }

    return res.json({ status: txStatus.toLowerCase() || 'pending', updated: false });

  } catch (error) {
    console.error('check-payment error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { checkPayment };
