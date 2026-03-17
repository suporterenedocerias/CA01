# API Backend — CaçambaJá (Express/Node.js)

API substituta das Edge Functions do Supabase para rodar em VPS própria.

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
FASTSOFT_SECRET_KEY=sua_chave_fastsoft
PORT=3001
```

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
