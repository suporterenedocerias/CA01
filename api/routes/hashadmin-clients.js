/**
 * Guarda/carrega configurações dos clientes CEO no servidor.
 * Protegido pelo HASHADMIN_SECRET — só o painel CEO consegue aceder.
 * Os dados ficam em /api/data/hashadmin-clients.json no servidor.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'hashadmin-clients.json');

function auth(req, res) {
  const secret = (process.env.VITE_HASHADMIN_SECRET || '').trim();
  const sent   = (req.headers['x-hashadmin-secret'] || '').trim();
  if (!secret || !sent || sent !== secret) {
    res.status(401).json({ error: 'Não autorizado' });
    return false;
  }
  return true;
}

function readClients() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}

function writeClients(clients) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2), 'utf8');
}

/** GET /api/hashadmin/clients */
function getClients(req, res) {
  if (!auth(req, res)) return;
  res.json(readClients());
}

/** POST /api/hashadmin/clients  — body: array completo de StoredClient */
function saveClients(req, res) {
  if (!auth(req, res)) return;
  const clients = req.body;
  if (!Array.isArray(clients)) return res.status(400).json({ error: 'body deve ser array' });
  writeClients(clients);
  res.json({ ok: true });
}

module.exports = { getClients, saveClients };
