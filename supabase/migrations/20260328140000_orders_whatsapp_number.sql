-- Liga pedidos PIX ao número WhatsApp (funcionário) que estava atribuído ao visitante.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_number_id uuid NULL REFERENCES public.whatsapp_numbers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_whatsapp_number_id_idx ON public.orders (whatsapp_number_id);

COMMENT ON COLUMN public.orders.whatsapp_number_id IS 'ID em whatsapp_numbers no momento do pedido (distribuição/rotação).';
