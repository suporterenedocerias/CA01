-- Pedidos de tarefa ao parceiro/fornecedor (área Ofertas no admin do cliente)
CREATE TABLE IF NOT EXISTS public.partner_task_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  details text NOT NULL DEFAULT '',
  site_offer_id uuid NULL REFERENCES public.site_offers (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'concluido', 'cancelado'))
);

CREATE INDEX IF NOT EXISTS idx_partner_task_requests_created ON public.partner_task_requests (created_at DESC);

ALTER TABLE public.partner_task_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage partner_task_requests"
  ON public.partner_task_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Painel mestre: leitura com chave anon (mesmo padrão que pedidos para agregação)
CREATE POLICY "Anon can read partner_task_requests for master"
  ON public.partner_task_requests
  FOR SELECT
  TO anon
  USING (true);

CREATE TRIGGER update_partner_task_requests_updated_at
  BEFORE UPDATE ON public.partner_task_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
