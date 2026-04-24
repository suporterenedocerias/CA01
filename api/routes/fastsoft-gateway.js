/**
 * Proxy Koliseu para o painel CEO.
 * Usa X-Gateway-Key (enviado pelo frontend, vem do localStorage do cliente)
 * ou cai no KOLISEU_API_KEY do .env.
 */

const KOLISEU_BASE = 'https://www.koliseu.cloud';

function getKey(req) {
  const fromHeader = req.headers['x-gateway-key'];
  return (fromHeader || process.env.KOLISEU_API_KEY || '').trim();
}

function koliseuHeaders(key) {
  return { 'x-api-key': key, 'Accept': 'application/json' };
}

/** GET /api/koliseu/payments */
async function listPayments(req, res) {
  try {
    const key = getKey(req);
    if (!key) return res.status(400).json({ error: 'Chave do gateway não configurada' });

    const params = new URLSearchParams(req.query).toString();
    const url = `${KOLISEU_BASE}/api/v1/pix/payments${params ? '?' + params : ''}`;

    const r = await fetch(url, { headers: koliseuHeaders(key) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(body);
    return res.json(body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/** GET /api/koliseu/payments/:id */
async function getPayment(req, res) {
  try {
    const key = getKey(req);
    if (!key) return res.status(400).json({ error: 'Chave do gateway não configurada' });

    const r = await fetch(`${KOLISEU_BASE}/api/v1/pix/payments/${req.params.id}`, {
      headers: koliseuHeaders(key),
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(body);
    return res.json(body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/** POST /api/koliseu/payments */
async function createPayment(req, res) {
  try {
    const key = getKey(req);
    if (!key) return res.status(400).json({ error: 'Chave do gateway não configurada' });

    const r = await fetch(`${KOLISEU_BASE}/api/v1/pix/payments`, {
      method: 'POST',
      headers: {
        ...koliseuHeaders(key),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(body);
    return res.json(body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

module.exports = { listPayments, getPayment, createPayment };
