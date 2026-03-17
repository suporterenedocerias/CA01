# O que é preciso para o site ficar no ar

Eu **não consigo** entrar na tua VPS. Tu precisas disto:

## 1. No servidor (VPS)

| Item | Onde |
|------|------|
| Código | `git pull` em `/var/www/pedircacamba` |
| API | `api/.env` (Supabase service_role, FastSoft, `PORT`) |
| Node API | `pm2 start api/server.js` (ou já a correr) |
| Front | `.env` na raiz com `VITE_SUPABASE_*` → `npm run build` → pasta `dist/` |

## 2. Painel aaPanel / Hostinger (obrigatório no teu caso)

A porta **80** do IP é do **painel**, não do Nginx “solto”.

1. **Website → Add site**
2. Domínio: `pedircacamba.com` + `www`
3. **Raiz do site:** `/var/www/pedircacamba/dist`
4. No **Nginx** desse site, cola o conteúdo de `deploy/aapanel-site.conf` (SPA + `/api/`)

## 3. DNS

Registos **A** `@` e **www** → **IP público da VPS** (o mesmo onde corre o aaPanel).

## 4. HTTPS

No aaPanel: SSL para o domínio, ou `certbot` se usares só Nginx do sistema.

---

## Erro no Git: `workflow` / `deploy.yml`

Não commits ficheiros em `.github/workflows/` sem token com scope **workflow**, ou apaga a pasta:

```powershell
Remove-Item -Recurse -Force .github\workflows -ErrorAction SilentlyContinue
git add -A
git commit -m "remove workflows"
git push origin main
```
