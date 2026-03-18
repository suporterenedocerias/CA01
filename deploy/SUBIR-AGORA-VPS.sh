#!/usr/bin/env bash
# pedircacamba — colocar no ar (aaPanel). Correr na VPS como root.
set -euo pipefail

echo ">> 1) Parar Nginx Ubuntu (liberta porta 80/443 para o aaPanel)"
systemctl stop nginx 2>/dev/null || true
systemctl mask nginx 2>/dev/null || true

echo ">> 2) Arrancar Nginx dos sites (aaPanel)"
if [[ -x /www/server/nginx/sbin/nginx ]]; then
  /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
  /www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf || true
else
  echo "AVISO: /www/server/nginx/sbin/nginx não encontrado — inicia Nginx no aaPanel (Serviço)."
fi

APP="/var/www/pedircacamba"
cd "$APP"
git pull origin main

echo ">> 3) API + build"
cd "$APP/api" && npm install --omit=dev && cd "$APP"
pm2 describe cacambaja-api >/dev/null 2>&1 && pm2 restart cacambaja-api || pm2 start "$APP/api/server.js" --name cacambaja-api
pm2 save 2>/dev/null || true

[[ -f "$APP/.env" ]] || echo "AVISO: cria $APP/.env com VITE_SUPABASE_*"
npm install && npm run build

echo ">> 4) Copiar para wwwroot do domínio"
rsync -a --exclude='.user.ini' "$APP/dist/" /www/wwwroot/pedircacamba.com/

echo ">> 4b) env.js (Supabase no browser — lê .env sem precisar rebuild)"
if [[ -f "$APP/.env" ]]; then
  node "$APP/deploy/write-env-js.mjs" "$APP/.env" /www/wwwroot/pedircacamba.com/env.js
else
  echo "AVISO: sem $APP/.env — cria com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY"
fi

echo ">> 5) Teste local"
PORT=$(grep -E '^[[:space:]]*PORT=' "$APP/api/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d ' \r"'"'" || echo "3000")
curl -s -m 3 "http://127.0.0.1:${PORT}/api/health" && echo "" || true
curl -sI -H "Host: pedircacamba.com" http://127.0.0.1/ | head -3

echo ""
echo "OK. Abre https://pedircacamba.com — Nginx aaPanel tem de estar verde no painel."
