-- Adiciona colunas de taxa do gateway de pagamento na tabela site_settings
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS taxa_gateway_pct  numeric(6,4) NOT NULL DEFAULT 6.99,
  ADD COLUMN IF NOT EXISTS taxa_gateway_fixa numeric(6,2) NOT NULL DEFAULT 2.29;
