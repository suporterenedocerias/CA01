/**
 * Proxy FastSoft para o painel CEO.
 * Usa X-Gateway-Key (enviado pelo frontend, vem do localStorage do cliente)
 * ou cai no FASTSOFT_SECRET_KEY do .env.
 */

const FASTSOFT_BASE = 'https://api.fastsoftbrasil.com';

function makeAuth(secretKey) {
  return 'Basic ' + Buffer.from(`x:${secretKey}`).toString('base64');
}

function getKey(req) {
  const fromHeader = req.headers['x-gateway-key'];
  return (fromHeader || process.env.FASTSOFT_SECRET_KEY || '').trim();
}

/** GET /api/fastsoft/transactions */
async function listTransactions(req, res) {
  try {
    const key = getKey(req);
    if (!key) return res.status(400).json({ error: 'Chave do gateway não configurada' });

    // Repassa query params (page, limit, status, start_date, end_date, etc.)
    const params = new URLSearchParams(req.query).toString();
    const url = `${FASTSOFT_BASE}/api/user/transactions${params ? '?' + params : ''}`;

    const r = await fetch(url, {
      headers: { Authorization: makeAuth(key), Accept: 'application/json' },
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(body);
    return res.json(body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/** GET /api/fastsoft/transactions/:id */
async function getTransaction(req, res) {
  try {
    const key = getKey(req);
    if (!key) return res.status(400).json({ error: 'Chave do gateway não configurada' });

    const r = await fetch(`${FASTSOFT_BASE}/api/user/transactions/${req.params.id}`, {
      headers: { Authorization: makeAuth(key), Accept: 'application/json' },
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(body);
    return res.json(body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/** POST /api/fastsoft/transactions */
async function createTransaction(req, res) {
  try {
    const key = getKey(req);
    if (!key) return res.status(400).json({ error: 'Chave do gateway não configurada' });

    const r = await fetch(`${FASTSOFT_BASE}/api/user/transactions`, {
      method: 'POST',
      headers: {
        Authorization: makeAuth(key),
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

module.exports = { listTransactions, getTransaction, createTransaction };
