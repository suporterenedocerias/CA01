require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createPixCharge } = require('./routes/create-pix-charge');
const { fastsoftWebhook } = require('./routes/fastsoft-webhook');
const { checkPayment } = require('./routes/check-payment');
const { createAdmin } = require('./routes/create-admin');
const { listTransactions, getTransaction, createTransaction } = require('./routes/fastsoft-gateway');
const { adminMagicLink } = require('./routes/admin-magic-link');
const { hashAdminTraffic, hashAdminSaveSpend } = require('./routes/hashadmin-traffic');
const { getClients, saveClients } = require('./routes/hashadmin-clients');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.post('/api/create-pix-charge', createPixCharge);
app.post('/api/fastsoft-webhook', fastsoftWebhook);
app.get('/api/check-payment/:orderId', checkPayment);
app.post('/api/create-admin', createAdmin);

// CEO → acesso admin (magic link)
app.post('/api/hashadmin/admin-link', adminMagicLink);

// CEO → tráfego & ROAS
app.get('/api/hashadmin/traffic', hashAdminTraffic);
app.post('/api/hashadmin/traffic/spend', hashAdminSaveSpend);

// CEO → clientes (armazenamento no servidor)
app.get('/api/hashadmin/clients', getClients);
app.post('/api/hashadmin/clients', saveClients);

// FastSoft gateway proxy (CEO)
app.get('/api/fastsoft/transactions', listTransactions);
app.get('/api/fastsoft/transactions/:id', getTransaction);
app.post('/api/fastsoft/transactions', createTransaction);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Entulho Hoje API rodando em http://0.0.0.0:${PORT} (acessível na rede local)`);
});
