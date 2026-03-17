-- ============================================================
-- MIGRATION SQL COMPLETO — CaçambaJá
-- Importar no SQL Editor do novo projeto Supabase
-- Gerado em: 2026-03-15
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

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

CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE public.whatsapp_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID REFERENCES public.whatsapp_numbers(id),
  visitor_id TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

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

-- ============================================================
-- 3. FUNÇÕES RPC
-- ============================================================

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
  SELECT wn.id, wn.number
    INTO v_number_id, v_number_value
  FROM public.whatsapp_clicks wc
  JOIN public.whatsapp_numbers wn ON wn.id = wc.number_id
  WHERE wc.visitor_id = p_visitor_id
    AND wn.active = true
  ORDER BY wc.created_at DESC
  LIMIT 1;

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

-- ============================================================
-- 4. REALTIME (opcional — habilitar para sincronização live)
-- ============================================================

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_numbers;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
