#!/bin/bash
# ─── Script para gerar o primeiro certificado SSL ───
# Uso: ./docker/ssl-init.sh seudominio.com seu@email.com

set -e

DOMAIN=${1:?"Uso: $0 <domínio> <email>"}
EMAIL=${2:?"Uso: $0 <domínio> <email>"}

echo "═══════════════════════════════════════════"
echo "  Inicializando SSL para: $DOMAIN"
echo "═══════════════════════════════════════════"

# 1. Subir apenas o frontend (sem SSL ainda) para servir o challenge
echo ">> Subindo containers sem SSL..."

# Criar nginx temporário só com HTTP (para o challenge funcionar)
cat > /tmp/nginx-temp.conf << 'EOF'
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

docker compose up -d api

# Rodar nginx temporário
docker compose run -d --name temp-nginx \
  -p 80:80 \
  -v certbot-webroot:/var/www/certbot \
  -v /tmp/nginx-temp.conf:/etc/nginx/conf.d/default.conf:ro \
  --entrypoint "" \
  frontend nginx -g 'daemon off;'

sleep 3

# 2. Solicitar certificado
echo ">> Solicitando certificado via Certbot..."
docker compose run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal

# 3. Parar nginx temporário
echo ">> Removendo nginx temporário..."
docker stop temp-nginx && docker rm temp-nginx

# 4. Configurar domínio no nginx
echo ">> Configurando DOMAIN=$DOMAIN no ambiente..."
echo "DOMAIN=$DOMAIN" >> .env.docker 2>/dev/null || true

# 5. Subir tudo com SSL
echo ">> Subindo todos os containers com SSL..."
DOMAIN="$DOMAIN" docker compose up -d --build

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ SSL configurado com sucesso!"
echo "  🌐 https://$DOMAIN"
echo "  🔄 Renovação automática ativa (12h)"
echo "═══════════════════════════════════════════"
