-- Adiciona colunas de gateway na site_settings
-- O CEO pode sobrescrever as chaves via painel HasHash sem precisar de SSH
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS gateway_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS gateway_public_key  TEXT;
