require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createPixCharge } = require('./routes/create-pix-charge');
const { fastsoftWebhook } = require('./routes/fastsoft-webhook');
const { createAdmin } = require('./routes/create-admin');

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
app.post('/api/create-admin', createAdmin);

app.listen(PORT, () => {
  console.log(`CaçambaJá API rodando na porta ${PORT}`);
});
