const { getSupabaseAdmin } = require('../lib/supabase');

/**
 * GET /api/hashadmin/traffic?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Retorna dados de tráfego dia a dia usando a service role key do servidor.
 * Usado pelo painel CEO para instâncias sem chave configurada no localStorage.
 *
 * Header opcional: X-Service-Key + X-Supabase-Url para consultar outro projeto.
 */
async function hashAdminTraffic(req, res) {
  try {
    const from = String(req.query.from || '').slice(0, 10);
    const to   = String(req.query.to   || '').slice(0, 10);

    if (!from || !to || from > to) {
      return res.status(400).json({ error: 'Parâmetros from e to obrigatórios (YYYY-MM-DD)' });
    }

    const tFrom = `${from}T00:00:00`;
    const tTo   = `${to}T23:59:59`;

    // Suporte a chave externa (outro projeto do cliente)
    const externalKey = (req.headers['x-service-key'] || '').trim();
    const externalUrl = (req.headers['x-supabase-url'] || '').trim();

    let sb;
    if (externalKey && externalUrl) {
      const { createClient } = require('@supabase/supabase-js');
      sb = createClient(externalUrl, externalKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      sb = getSupabaseAdmin();
    }

    const [clicksRes, leadsRes, ordersRes, spendRes] = await Promise.all([
      sb.from('whatsapp_clicks').select('created_at').gte('created_at', tFrom).lte('created_at', tTo),
      sb.from('leads').select('created_at').gte('created_at', tFrom).lte('created_at', tTo),
      sb.from('orders').select('created_at, payment_status, status, valor_total').gte('created_at', tFrom).lte('created_at', tTo),
      sb.from('ad_spend').select('date, spend').gte('date', from).lte('date', to),
    ]);

    if (clicksRes.error) throw new Error(clicksRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    // Agrupa por dia
    const clicks = {}, leads = {}, ped = {}, pagos = {}, fat = {}, spend = {};

    for (const r of spendRes.data ?? []) spend[r.date] = Number(r.spend || 0);
    for (const r of clicksRes.data ?? []) { const d = r.created_at.slice(0, 10); clicks[d] = (clicks[d] || 0) + 1; }
    for (const r of leadsRes.data ?? [])  { const d = r.created_at.slice(0, 10); leads[d]  = (leads[d]  || 0) + 1; }
    for (const r of ordersRes.data ?? []) {
      const d = r.created_at.slice(0, 10);
      ped[d] = (ped[d] || 0) + 1;
      if (r.payment_status === 'paid' || r.status === 'pago') {
        pagos[d] = (pagos[d] || 0) + 1;
        fat[d]   = (fat[d]   || 0) + Number(r.valor_total || 0);
      }
    }

    // Gera array de dias
    const rows = [];
    const cur = new Date(from + 'T12:00:00Z');
    const end = new Date(to   + 'T12:00:00Z');
    while (cur <= end) {
      const d = cur.toISOString().slice(0, 10);
      rows.push({
        date:        d,
        cliques:     clicks[d] ?? 0,
        leads:       leads[d]  ?? 0,
        pedidos:     ped[d]    ?? 0,
        pagos:       pagos[d]  ?? 0,
        faturamento: fat[d]    ?? 0,
        spend:       spend[d]  ?? 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    return res.json({ rows });
  } catch (err) {
    console.error('[hashadmin-traffic]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/hashadmin/traffic/spend
 * Body: { date: 'YYYY-MM-DD', spend: 123.45 }
 * Headers opcionais: X-Service-Key + X-Supabase-Url
 */
async function hashAdminSaveSpend(req, res) {
  try {
    const { date, spend } = req.body;
    if (!date || spend == null) return res.status(400).json({ error: 'date e spend obrigatórios' });

    const externalKey = (req.headers['x-service-key'] || '').trim();
    const externalUrl = (req.headers['x-supabase-url'] || '').trim();

    let sb;
    if (externalKey && externalUrl) {
      const { createClient } = require('@supabase/supabase-js');
      sb = createClient(externalUrl, externalKey, { auth: { persistSession: false } });
    } else {
      sb = getSupabaseAdmin();
    }

    const { error } = await sb.from('ad_spend').upsert({ date, spend: Number(spend) }, { onConflict: 'date' });
    if (error) throw new Error(error.message);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { hashAdminTraffic, hashAdminSaveSpend };
