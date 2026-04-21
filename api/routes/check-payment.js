const { getSupabaseAdmin } = require('../lib/supabase');

async function checkPayment(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: 'orderId obrigatório' });

    const supabase = getSupabaseAdmin();
    const { data: order, error: dbErr } = await supabase
      .from('orders')
      .select('id, fastsoft_transaction_id, payment_status')
      .eq('id', orderId)
      .single();

    if (dbErr || !order) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (order.payment_status === 'paid') return res.json({ status: 'paid', updated: false });
    if (!order.fastsoft_transaction_id) return res.status(400).json({ error: 'Sem ID de transação FastSoft' });

    const FASTSOFT_SECRET_KEY = process.env.FASTSOFT_SECRET_KEY;
    if (!FASTSOFT_SECRET_KEY) throw new Error('FASTSOFT_SECRET_KEY not configured');

    const tokenBase64 = Buffer.from(`x:${FASTSOFT_SECRET_KEY}`).toString('base64');

    const txRes = await fetch(
      `https://api.fastsoftbrasil.com/api/user/transactions/${order.fastsoft_transaction_id}`,
      {
        headers: {
          'Authorization': `Basic ${tokenBase64}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!txRes.ok) {
      const errData = await txRes.json().catch(() => ({}));
      console.error('FastSoft check error:', errData);
      return res.status(502).json({ error: 'Erro ao consultar FastSoft', details: errData });
    }

    const txData = await txRes.json();
    const tx = txData.data || txData;
    const txStatus = (tx.status || '').toUpperCase();

    console.log(`Check payment order=${orderId} tx=${order.fastsoft_transaction_id} status=${txStatus}`);

    if (txStatus === 'PAID' || txStatus === 'APPROVED') {
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
