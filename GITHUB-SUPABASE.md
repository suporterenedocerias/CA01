# GitHub + Supabase — o que falta fazer à mão

## 1. Supabase (painel)

1. [supabase.com](https://supabase.com) → projeto → **Settings** → **API**
2. Copia **Project URL** e **anon public** → cola no ficheiro **`.env`** na raiz (usa `.env.example` como modelo):
   - `VITE_SUPABASE_URL=`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=`
3. Copia **service_role** (secreta) → só no servidor, ficheiro **`api/.env`**:
   - `SUPABASE_URL=`
   - `SUPABASE_SERVICE_ROLE_KEY=`
   - `FASTSOFT_SECRET_KEY=` (se usas PIX FastSoft)

> Nunca commits `service_role` nem o `.env` — já estão no `.gitignore`.

## 2. GitHub (site)

1. Cria repositório em [github.com/new](https://github.com/new) (pode ser **Private**).
2. No PowerShell, **na pasta do projeto**:

```powershell
cd "C:\Users\alexm\Downloads\Meu Projeto (1)"
git remote add origin https://github.com/TEU_USUARIO/TEU_REPO.git
git branch -M main
git push -u origin main
```

(GitHub pede utilizador + **Personal Access Token** em vez da password: [Tokens](https://github.com/settings/tokens) → scope **repo**.)

## 3. VPS (depois do push)

```bash
cd /var/www/pedircacamba
git clone https://github.com/TEU_USUARIO/TEU_REPO.git .
# Criar api/.env e .env na raiz (copiar dos .env.example e preencher)
cd api && npm install --omit=dev && pm2 start server.js --name cacambaja-api
cd .. && npm install && npm run build
# Nginx → root = dist, /api/ → 3001
```
