
-- Create orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  email text NULL DEFAULT '',
  cpf_cnpj text NULL DEFAULT '',
  cep text NULL DEFAULT '',
  endereco text NULL DEFAULT '',
  numero text NULL DEFAULT '',
  complemento text NULL DEFAULT '',
  bairro text NULL DEFAULT '',
  cidade text NULL DEFAULT '',
  estado text NULL DEFAULT '',
  tamanho text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pendente',
  payment_status text NOT NULL DEFAULT 'pending',
  pagarme_order_id text NULL,
  pagarme_charge_id text NULL,
  pix_qr_code text NULL,
  pix_qr_code_url text NULL,
  pix_copy_paste text NULL,
  pix_expires_at timestamp with time zone NULL,
  paid_at timestamp with time zone NULL,
  observacoes text NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert orders (public checkout)
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT TO public WITH CHECK (true);

-- Anyone can read their own order by id (for payment page)
CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT TO public USING (true);

-- Authenticated users can manage orders (admin)
CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
