#!/usr/bin/env bash
# =============================================================================
# CORRE NA VPS UMA VEZ (como root): copia o bloco abaixo inteiro e cola no SSH
#
#   curl -sL https://raw.githubusercontent.com/hiagosilva321/Cusor-meu-projeto/main/deploy/COLAR-NA-VPS-UM-COMANDO.sh | bash
#
# Ou: cd /var/www/pedircacamba && git pull && bash deploy/COLAR-NA-VPS-UM-COMANDO.sh
# =============================================================================
set -euo pipefail

APP="${APP_DIR:-/var/www/pedircacamba}"
echo ">> Pasta do projeto: $APP"
cd "$APP" 2>/dev/null || { echo "ERRO: $APP não existe. Ajusta APP_DIR ou faz git clone."; exit 1; }

echo ">> git pull"
git pull origin main || true

echo ">> API"
cd "$APP/api"
npm install --omit=dev
cd "$APP"
if pm2 describe cacambaja-api >/dev/null 2>&1; then
  pm2 restart cacambaja-api
else
  pm2 start "$APP/api/server.js" --name cacambaja-api || true
  pm2 save || true
fi

echo ">> Build front (precisa .env na raiz com VITE_*)"
cd "$APP"
[[ -f .env ]] || echo "AVISO: falta $APP/.env"
npm install
npm run build

echo ">> Teste API (ajusta porta se api/.env PORT for outra)"
PORT=$(grep -E '^[[:space:]]*PORT=' "$APP/api/.env" 2>/dev/null | head -1 | cut -d= -f2 | tr -d ' \r"'"'" || echo "3000")
curl -s -m 3 "http://127.0.0.1:${PORT}/api/health" && echo "" || echo "API não responde na porta $PORT"

echo ">> Nginx (teste)"
if command -v nginx >/dev/null 2>&1; then
  nginx -t 2>&1 || true
  if nginx -t 2>/dev/null; then
    systemctl start nginx 2>/dev/null || service nginx start 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true
  else
    echo "Nginx com ERRO de config — corrigir no aaPanel ou: nginx -t"
  fi
fi

echo ""
echo "========== FEITO (lado servidor) =========="
echo "1) aaPanel → site → raiz = $APP/dist"
echo "2) Nginx do site: ver deploy/aapanel-site.conf (proxy /api/ + try_files)"
echo "3) SSL já no painel → abre https://teu-dominio"
echo "============================================"
