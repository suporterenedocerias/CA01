# CI/CD — Deploy Automatizado via GitHub Actions

## Pré-requisitos na VPS

1. Docker e Docker Compose instalados
2. Git instalado e repositório clonado em `/opt/cacambaja` (ou outro diretório)
3. Arquivos `.env` configurados na VPS (não versionados)
4. Certificado SSL já gerado (`./docker/ssl-init.sh`)

## Configurar Secrets no GitHub

Vá em **Settings → Secrets and variables → Actions** no seu repositório e adicione:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `VPS_HOST` | IP ou domínio da VPS | `123.45.67.89` |
| `VPS_USER` | Usuário SSH | `root` ou `deploy` |
| `VPS_SSH_KEY` | Chave privada SSH (conteúdo completo) | `-----BEGIN OPENSSH...` |
| `VPS_PORT` | Porta SSH (opcional, padrão 22) | `22` |
| `APP_DIR` | Diretório do projeto na VPS (opcional) | `/opt/cacambaja` |

### Gerar chave SSH dedicada (recomendado)

```bash
# Na sua máquina local
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""

# Copiar chave pública para a VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub usuario@sua-vps

# Copiar conteúdo da chave privada para o secret VPS_SSH_KEY
cat ~/.ssh/deploy_key
```

## Como funciona

1. Push na branch `main` → dispara o workflow automaticamente
2. GitHub Actions conecta na VPS via SSH
3. Executa `git pull` + `docker compose build` + `docker compose up -d`
4. Aguarda health check da API (`/api/health`)
5. Limpa imagens Docker antigas

## Deploy manual

Também é possível disparar manualmente:
- Vá em **Actions → Deploy to VPS → Run workflow**

## Verificação pós-deploy

```bash
# Na VPS
docker compose ps
curl http://localhost:3001/api/health

# Externamente
curl https://seudominio.com/api/health
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| SSH connection refused | Verifique `VPS_HOST`, `VPS_PORT` e firewall |
| Permission denied | Verifique `VPS_SSH_KEY` e `VPS_USER` |
| Health check falha | Veja logs: `docker compose logs api` |
| Build falha | Verifique `.env` na VPS e espaço em disco |
