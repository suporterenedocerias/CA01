# Por que “não dá para arrumar daí”

**Ninguém no Cursor/IDE consegue entrar no teu servidor.**  
Não há acesso SSH ao teu IP, nem login ao aaPanel. Só **tu** podes clicar no painel ou colar comandos no terminal da VPS.

---

## O mínimo que tens de fazer (1 minuto)

Na VPS, **uma linha** (SSH como root):

```bash
cd /var/www/pedircacamba && git pull origin main && bash deploy/COLAR-NA-VPS-UM-COMANDO.sh
```

Se o projeto estiver noutra pasta:

```bash
export APP_DIR=/caminho/para/o/projeto
bash /caminho/para/o/projeto/deploy/COLAR-NA-VPS-UM-COMANDO.sh
```

Isto faz: **pull**, **API + PM2**, **npm run build**, testa **health**, tenta **nginx -t / start**.

---

## O que continua só no aaPanel (cliques)

- Raiz do site = pasta **`dist`**
- Nginx com **`/api/`** + **`try_files`** → ficheiro **`deploy/aapanel-site.conf`**
- SSL (já disseste que tens)

Sem estes 3 no painel, **nenhum script** substitui.

---

## Resumo

| Quem | O quê |
|------|--------|
| **Script na VPS** | Código atualizado, build, API |
| **Tu no aaPanel** | Domínio → `dist` + Nginx + SSL |
