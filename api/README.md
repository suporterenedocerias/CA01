# API Backend — Entulho Hoje (Express / Node.js)

Substitui as Edge Functions do Supabase quando a API corre na VPS. **Pagamentos:** Fluxxopay usa a API **FastSoft** (`https://api.fastsoftbrasil.com`) — ver [getting-started](https://developers.fastsoftbrasil.com/docs/intro/getting-started).

## Setup

```bash
cd api
npm install
cp .env.example .env
# Edite o .env com suas credenciais
node server.js
```

## Variáveis de Ambiente (.env)

```
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
FASTSOFT_SECRET_KEY=sk_...          # obrigatório para PIX
FASTSOFT_PUBLIC_KEY=pk_...          # opcional (reserva)
FASTSOFT_POSTBACK_URL=https://...   # opcional; se vazio, postback = função Supabase ou /api/local
PORT=3001
```

**Webhook:** a FastSoft precisa de uma URL **pública HTTPS**. Em produção defina `FASTSOFT_POSTBACK_URL` para `https://seudominio.com/api/fastsoft-webhook` (com Nginx a fazer proxy para esta API). Se só tiver `SUPABASE_URL` e tiver deployado `fastsoft-webhook` no Supabase, pode omitir e usar a função edge.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/create-pix-charge` | Gera cobrança PIX via FastSoft |
| POST | `/api/fastsoft-webhook` | Recebe confirmação de pagamento |
| POST | `/api/create-admin` | Cria primeiro usuário admin |
| GET | `/api/health` | Health check |

## Health Check

O endpoint de saúde é usado pelo Docker e ferramentas de monitoramento:

```bash
# Local
curl http://localhost:3001/api/health

# Produção (via Nginx/HTTPS)
curl https://seudominio.com/api/health
```

Resposta esperada:
```json
{"status":"ok","timestamp":"2026-03-15T12:00:00.000Z"}
```

O Docker verifica automaticamente a cada 30s. Containers que falharem 3 vezes seguidas são reiniciados.

## Produção com PM2

```bash
npm install -g pm2
pm2 start server.js --name cacambaja-api
pm2 save
pm2 startup
```

## Nginx Reverse Proxy

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
