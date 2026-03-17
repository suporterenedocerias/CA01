# Guia Completo de Migração — CaçambaJá

> Migração total do projeto Lovable para VPS própria com Supabase independente.

---

## 1. Visão Geral da Arquitetura Atual

```
┌─────────────────────────────────────────────┐
│              LOVABLE CLOUD                  │
│                                             │
│  ┌──────────┐    ┌────────────────────────┐ │
│  │ Frontend  │───▶│  Supabase (Backend)    │ │
│  │ React/Vite│    │  - PostgreSQL          │ │
│  │ Nginx     │    │  - Auth                │ │
│  └──────────┘    │  - Edge Functions      │ │
│                  │  - RLS Policies        │ │
│                  │  - RPC Functions       │ │
│                  └────────────────────────┘ │
│                           ▲                 │
│                           │ webhook         │
│                  ┌────────┴───────┐         │
│                  │  FastSoft API  │         │
│                  │  (PIX Gateway) │         │
│                  └────────────────┘         │
└─────────────────────────────────────────────┘
```

### Rotas do Frontend
| Rota | Descrição |
|------|-----------|
| `/` | Landing page pública |
| `/checkout` | Formulário de pedido |
| `/pagamento/:orderId` | Tela de pagamento PIX |
| `/pagamento-confirmado/:orderId` | Confirmação de pagamento |
| `/admin` | Login administrativo |
| `/admin/dashboard` | Dashboard admin |
| `/admin/leads` | Gestão de leads |
| `/admin/orders` | Gestão de pedidos |
| `/admin/sizes` | Tamanhos de caçamba |
| `/admin/whatsapp` | Números WhatsApp |
| `/admin/counters` | Contadores do site |
| `/admin/regions` | Regiões atendidas |
| `/admin/settings` | Configurações gerais |

---

## 2. Dependências do Projeto

### Produção (package.json)
```
@supabase/supabase-js  ^2.99.0   — Cliente Supabase
@tanstack/react-query   ^5.83.0   — Cache/fetching
react-router-dom        ^6.30.1   — Roteamento SPA
react-hook-form         ^7.61.1   — Formulários
zod                     ^3.25.76  — Validação
qrcode.react            ^4.2.0    — QR Code PIX
framer-motion           ^12.35.2  — Animações
lucide-react            ^0.462.0  — Ícones
recharts                ^2.15.4   — Gráficos admin
sonner                  ^1.7.4    — Toasts
date-fns                ^3.6.0    — Datas
shadcn/ui (radix-ui)    vários    — Componentes UI
```

### Dev
```
vite           ^5.4.19
typescript     ^5.8.3
tailwindcss    ^3.4.17
vitest         ^3.2.4
playwright     ^1.57.0
```

---

## 3. Schema SQL Completo do Banco

### 3.1 Tabelas

```sql
-- ============================================
-- TABELA: dumpster_sizes (Tamanhos de caçamba)
-- ============================================
CREATE TABLE public.dumpster_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: leads
-- ============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT DEFAULT '',
  cpf_cnpj TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  complemento TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  tamanho TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Novo',
  observacoes TEXT DEFAULT '',
  numero_atribuido TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: orders (Pedidos / PIX)
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT DEFAULT '',
  cpf_cnpj TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  complemento TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  tamanho TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'pendente',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  fastsoft_transaction_id TEXT,
  fastsoft_external_ref TEXT,
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  pix_copy_paste TEXT,
  pix_expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: regions (Regiões atendidas)
-- ============================================
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: site_counters
-- ============================================
CREATE TABLE public.site_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  value INTEGER NOT NULL DEFAULT 0,
  suffix TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: site_settings
-- ============================================
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'CaçambaJá',
  whatsapp_principal TEXT DEFAULT '',
  telefone_principal TEXT DEFAULT '',
  email_contato TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  endereco_empresa TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: whatsapp_numbers
-- ============================================
CREATE TABLE public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  peso_distribuicao INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: whatsapp_clicks
-- ============================================
CREATE TABLE public.whatsapp_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID REFERENCES public.whatsapp_numbers(id),
  visitor_id TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 RLS Policies

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.dumpster_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;

-- dumpster_sizes
CREATE POLICY "Anyone can read active dumpster sizes" ON public.dumpster_sizes
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated users can manage dumpster sizes" ON public.dumpster_sizes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- leads
CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can read leads" ON public.leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- orders
CREATE POLICY "Anyone can insert orders" ON public.orders
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read orders" ON public.orders
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage orders" ON public.orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- regions
CREATE POLICY "Anyone can read active regions" ON public.regions
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated users can manage regions" ON public.regions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_counters
CREATE POLICY "Anyone can read active site counters" ON public.site_counters
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated users can manage site counters" ON public.site_counters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_settings
CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can update site settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- whatsapp_numbers
CREATE POLICY "Anyone can read active whatsapp numbers" ON public.whatsapp_numbers
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated users can manage whatsapp numbers" ON public.whatsapp_numbers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- whatsapp_clicks
CREATE POLICY "Anyone can insert whatsapp clicks" ON public.whatsapp_clicks
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated users can read whatsapp clicks" ON public.whatsapp_clicks
  FOR SELECT TO authenticated USING (true);
```

### 3.3 Funções RPC

```sql
-- ============================================
-- FUNÇÃO: register_weighted_whatsapp_click
-- Seleciona número com menor ratio cliques/peso
-- ============================================
CREATE OR REPLACE FUNCTION public.register_weighted_whatsapp_click(
  p_visitor_id TEXT,
  p_page_url TEXT
)
RETURNS TABLE(number_id UUID, number_value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number_id UUID;
  v_number_value TEXT;
BEGIN
  -- Visitante recorrente: manter o mesmo número
  SELECT wn.id, wn.number
    INTO v_number_id, v_number_value
  FROM public.whatsapp_clicks wc
  JOIN public.whatsapp_numbers wn ON wn.id = wc.number_id
  WHERE wc.visitor_id = p_visitor_id
    AND wn.active = true
  ORDER BY wc.created_at DESC
  LIMIT 1;

  -- Novo visitante: número com menor ratio
  IF v_number_id IS NULL THEN
    SELECT wn.id, wn.number
      INTO v_number_id, v_number_value
    FROM public.whatsapp_numbers wn
    WHERE wn.active = true
    ORDER BY
      (wn.click_count::NUMERIC / GREATEST(wn.peso_distribuicao, 1)::NUMERIC) ASC,
      wn.click_count ASC,
      wn.order_index ASC
    LIMIT 1;
  END IF;

  IF v_number_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url)
  VALUES (v_number_id, p_visitor_id, p_page_url);

  UPDATE public.whatsapp_numbers
  SET click_count = click_count + 1
  WHERE id = v_number_id;

  RETURN QUERY SELECT v_number_id, v_number_value;
END;
$$;

-- ============================================
-- FUNÇÃO: register_whatsapp_click
-- Registra clique em número específico
-- ============================================
CREATE OR REPLACE FUNCTION public.register_whatsapp_click(
  p_number_id UUID,
  p_visitor_id TEXT,
  p_page_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url)
  VALUES (p_number_id, p_visitor_id, p_page_url);

  UPDATE public.whatsapp_numbers
  SET click_count = click_count + 1
  WHERE id = p_number_id;
END;
$$;

-- ============================================
-- FUNÇÃO: get_click_stats
-- Estatísticas de cliques por número
-- ============================================
CREATE OR REPLACE FUNCTION public.get_click_stats()
RETURNS TABLE(
  number_id UUID,
  number_label TEXT,
  number_value TEXT,
  total_clicks BIGINT,
  clicks_today BIGINT,
  clicks_week BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wn.id AS number_id,
    wn.label AS number_label,
    wn.number AS number_value,
    COUNT(wc.id) AS total_clicks,
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE) AS clicks_today,
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE - INTERVAL '7 days') AS clicks_week
  FROM public.whatsapp_numbers wn
  LEFT JOIN public.whatsapp_clicks wc ON wc.number_id = wn.id
  WHERE wn.active = true
  GROUP BY wn.id, wn.label, wn.number
  ORDER BY total_clicks DESC;
$$;

-- ============================================
-- FUNÇÃO: update_updated_at_column (trigger)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## 4. Edge Functions

### 4.1 create-pix-charge
**Função:** Gera cobrança PIX via FastSoft API e salva pedido no banco.

**Arquivo:** `supabase/functions/create-pix-charge/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, whatsapp, email, cpf_cnpj, cep, endereco, numero, complemento,
            bairro, cidade, estado, tamanho, quantidade, valor_unitario, observacoes } = await req.json();

    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome, whatsapp, tamanho, valor_unitario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const qtd = quantidade || 1;
    const valor_total = valor_unitario * qtd;
    const amount = Math.round(valor_total * 100);

    const FASTSOFT_SECRET_KEY = Deno.env.get('FASTSOFT_SECRET_KEY');
    if (!FASTSOFT_SECRET_KEY) throw new Error('FASTSOFT_SECRET_KEY not configured');

    const authString = `x:${FASTSOFT_SECRET_KEY}`;
    const tokenBase64 = base64Encode(new TextEncoder().encode(authString));
    const orderRef = crypto.randomUUID().slice(0, 8);
    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');
    const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';

    const payload = {
      amount,
      paymentMethod: 'PIX',
      customer: {
        name: nome,
        email: email || `${whatsapp.replace(/\D/g, '')}@noemail.com`,
        document: { number: cleanDoc || '00000000000', type: docType },
        phone: whatsapp.replace(/\D/g, ''),
        externaRef: `cli_${orderRef}`,
      },
      shipping: {
        fee: 0,
        address: {
          street: endereco || '', streetNumber: numero || '',
          complement: complemento || '', zipCode: (cep || '').replace(/\D/g, ''),
          neighborhood: bairro || '', city: cidade || '',
          state: estado || '', country: 'br',
        },
      },
      items: [{
        title: `Caçamba ${tamanho} x${qtd}`,
        unitPrice: amount, quantity: 1,
        tangible: false, externalRef: `ped_${orderRef}`,
      }],
      postbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/fastsoft-webhook`,
      metadata: { order_ref: orderRef },
      traceable: true,
      pix: { expiresInDays: 1 },
    };

    const response = await fetch('https://api.fastsoftbrasil.com/api/user/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${tokenBase64}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('FastSoft error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Erro ao gerar cobrança PIX', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const txData = data.data;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: dbError } = await supabase.from('orders').insert({
      nome, whatsapp, email: email || '', cpf_cnpj: cpf_cnpj || '',
      cep: cep || '', endereco: endereco || '', numero: numero || '',
      complemento: complemento || '', bairro: bairro || '',
      cidade: cidade || '', estado: estado || '', tamanho,
      quantidade: qtd, valor_unitario, valor_total,
      forma_pagamento: 'pix', status: 'aguardando_pagamento',
      payment_status: 'pending',
      fastsoft_transaction_id: txData?.id || null,
      fastsoft_external_ref: `ped_${orderRef}`,
      pix_qr_code: txData?.pix?.qrcode || null,
      pix_qr_code_url: null,
      pix_copy_paste: txData?.pix?.qrcode || txData?.pix?.url || null,
      pix_expires_at: txData?.pix?.expirationDate || new Date(Date.now() + 86400000).toISOString(),
      observacoes: observacoes || '',
    }).select().single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      order_id: order.id,
      pix_qr_code: txData?.pix?.qrcode || null,
      pix_copy_paste: txData?.pix?.qrcode || txData?.pix?.url || null,
      expires_at: txData?.pix?.expirationDate || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

### 4.2 fastsoft-webhook
**Função:** Recebe notificação de pagamento PIX confirmado e atualiza o pedido.

**Arquivo:** `supabase/functions/fastsoft-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('FastSoft Webhook received:', JSON.stringify(body));

    const transactionData = body.data;

    if (transactionData && transactionData.status === 'PAID') {
      let metadata: any = {};
      try {
        metadata = typeof transactionData.metadata === 'string'
          ? JSON.parse(transactionData.metadata)
          : transactionData.metadata;
      } catch (e) {
        console.error('Metadata parse error:', e);
      }

      const transactionId = transactionData.id;

      if (transactionId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'pago',
            paid_at: new Date().toISOString(),
          })
          .eq('fastsoft_transaction_id', transactionId);

        if (error) throw error;
        console.log('Order updated to paid for transaction:', transactionId);
      }
    }

    return new Response(JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

### 4.3 create-admin
**Função:** Cria o primeiro usuário admin (uso único).

```typescript
// Veja supabase/functions/create-admin/index.ts
// Cria usuário admin via supabase.auth.admin.createUser()
// Bloqueia criação se já existir algum usuário
```

---

## 5. Variáveis de Ambiente e Secrets

### Frontend (build time — `.env`)
| Variável | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key (pública) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |

### Backend (Edge Functions — secrets do Supabase)
| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | URL interna (auto-injetada) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin (auto-injetada) |
| `SUPABASE_ANON_KEY` | Chave anon (auto-injetada) |
| `FASTSOFT_SECRET_KEY` | Chave da API FastSoft/FluxoPay |
| `LOVABLE_API_KEY` | API Lovable AI (não será necessária) |

---

## 6. Passo a Passo da Migração Completa

### FASE 1: Criar Projeto Supabase Próprio

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto (anote a **URL**, **anon key** e **service_role_key**)
3. No **SQL Editor** do dashboard, execute todo o SQL da Seção 3 (tabelas → RLS → funções)
4. Verifique que todas as 8 tabelas foram criadas

### FASE 2: Exportar Dados do Banco Atual

No painel Lovable Cloud, exporte os dados de cada tabela:
- `dumpster_sizes` — tamanhos e preços
- `regions` — regiões
- `site_settings` — configurações do site
- `site_counters` — contadores
- `whatsapp_numbers` — números WhatsApp
- `leads` — leads existentes
- `orders` — pedidos existentes
- `whatsapp_clicks` — histórico de cliques

Importe no novo Supabase via **SQL Editor** ou **CSV Import**.

### FASE 3: Configurar Auth no Novo Supabase

1. No dashboard Supabase → Authentication → Settings
2. Configure conforme necessário (email/password habilitado)
3. Execute a Edge Function `create-admin` para criar o primeiro admin
4. Ou crie manualmente via dashboard: Authentication → Users → Add User

### FASE 4: Deploy das Edge Functions

```bash
# Instale o Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao novo projeto
supabase link --project-ref SEU_PROJECT_REF

# Configure secrets
supabase secrets set FASTSOFT_SECRET_KEY=sua_chave_fastsoft

# Deploy das funções
supabase functions deploy create-pix-charge --no-verify-jwt
supabase functions deploy fastsoft-webhook --no-verify-jwt
supabase functions deploy create-admin --no-verify-jwt
```

### FASE 5: Atualizar Webhook da FastSoft

No painel da FastSoft/FluxoPay, atualize a URL do webhook para:
```
https://SEU_NOVO_PROJECT_REF.supabase.co/functions/v1/fastsoft-webhook
```

### FASE 6: Configurar o Frontend

1. Clone o repositório do GitHub
2. Crie o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://SEU_NOVO_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_NOVA_ANON_KEY
VITE_SUPABASE_PROJECT_ID=SEU_NOVO_PROJECT_REF
```

3. Instale e build:
```bash
npm install
npm run build
```

4. A pasta `dist/` contém o site estático pronto para servir.

### FASE 7: Configurar VPS com Nginx

```bash
# Instale Nginx
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Copie o build
sudo mkdir -p /var/www/cacambaja
sudo cp -r dist/* /var/www/cacambaja/
```

**Nginx config** (`/etc/nginx/sites-available/cacambaja`):

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    root /var/www/cacambaja;
    index index.html;

    # SPA — todas as rotas redirecionam para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Habilite e configure SSL
sudo ln -s /etc/nginx/sites-available/cacambaja /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

---

## 7. Opção Alternativa: Converter Edge Functions para Express (Node.js)

Se preferir **não usar Supabase Edge Functions**, converta para uma API Express na VPS:

```bash
mkdir api && cd api
npm init -y
npm install express cors @supabase/supabase-js
```

**api/server.js:**
```javascript
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/create-pix-charge
app.post('/api/create-pix-charge', async (req, res) => {
  // Cole a lógica de create-pix-charge/index.ts aqui
  // Substitua Deno.env.get() por process.env
  // Substitua base64Encode por Buffer.from().toString('base64')
});

// POST /api/fastsoft-webhook
app.post('/api/fastsoft-webhook', async (req, res) => {
  // Cole a lógica de fastsoft-webhook/index.ts aqui
});

app.listen(3001, () => console.log('API running on :3001'));
```

> ⚠️ Se usar Express, atualize no frontend as chamadas de `supabase.functions.invoke()` para `fetch('https://seudominio.com.br/api/...')`.

---

## 8. Checklist Final de Migração

### Banco de Dados
- [ ] Todas as 8 tabelas criadas no novo Supabase
- [ ] Todas as 4 funções RPC criadas
- [ ] Todas as RLS policies aplicadas
- [ ] Dados exportados e importados
- [ ] Trigger `update_updated_at_column` criada (se necessário)

### Autenticação
- [ ] Auth configurado no novo Supabase
- [ ] Usuário admin criado
- [ ] Login admin testado

### Edge Functions / API
- [ ] `create-pix-charge` deployada e testada
- [ ] `fastsoft-webhook` deployada e testada
- [ ] `create-admin` deployada
- [ ] Secret `FASTSOFT_SECRET_KEY` configurada

### Frontend
- [ ] `.env` atualizado com novas credenciais
- [ ] Build gerado com sucesso (`npm run build`)
- [ ] Servido via Nginx na VPS
- [ ] SSL configurado (certbot)
- [ ] Todas as rotas funcionando (SPA redirect)

### Integrações Externas
- [ ] URL do webhook atualizada no painel FastSoft
- [ ] Domínio apontando para IP da VPS (DNS)

### Testes Funcionais
- [ ] Landing page carrega corretamente
- [ ] Tamanhos de caçamba aparecem do banco
- [ ] Regiões aparecem do banco
- [ ] Contadores aparecem do banco
- [ ] Botão WhatsApp rotaciona números
- [ ] Formulário de checkout funciona
- [ ] PIX é gerado corretamente
- [ ] QR Code aparece na tela de pagamento
- [ ] Webhook atualiza pedido para "pago"
- [ ] Painel admin acessível em /admin
- [ ] Login admin funciona
- [ ] CRUD de leads funciona
- [ ] CRUD de pedidos funciona
- [ ] CRUD de tamanhos funciona
- [ ] CRUD de números WhatsApp funciona
- [ ] Estatísticas de cliques funcionam

---

## 9. Resumo das Decisões

| Componente | Onde fica após migração |
|------------|------------------------|
| Frontend React | VPS (Nginx, arquivos estáticos) |
| Banco PostgreSQL | Supabase próprio (ou PostgreSQL na VPS) |
| Auth | Supabase Auth |
| Edge Functions | Supabase Functions (ou Express na VPS) |
| Webhook PIX | Supabase Function URL (ou Express) |
| DNS/SSL | VPS (Certbot/Let's Encrypt) |
| FastSoft API | Externo (não muda) |

---

*Guia gerado em 2026-03-15. Versão do projeto: vite_react_shadcn_ts 0.0.0*
