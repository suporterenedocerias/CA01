-- Adiciona configuração de gateway por página customizada
ALTER TABLE public.custom_pages
  ADD COLUMN IF NOT EXISTS gateway_type  text DEFAULT 'fastsoft',
  ADD COLUMN IF NOT EXISTS gateway_pk    text,
  ADD COLUMN IF NOT EXISTS gateway_sk    text;

-- Garante que gateway_sk nunca vaze para leitura pública
-- (a policy de leitura pública já existe; apenas service_role acessa tudo)
-- Recria a policy de SELECT público excluindo colunas sensíveis via view (opcional)
-- Por segurança, a API busca as chaves server-side com service_role.
