-- Ofertas promocionais (admin + landing)
CREATE TABLE public.site_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  badge TEXT NOT NULL DEFAULT 'Oferta',
  price_current NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_original NUMERIC(10,2) NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.site_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active site offers" ON public.site_offers
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Authenticated users can manage site offers" ON public.site_offers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_site_offers_updated_at
  BEFORE UPDATE ON public.site_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Exemplos editáveis no painel
INSERT INTO public.site_offers (title, description, badge, price_current, price_original, active, order_index) VALUES
('Caçamba 5m³ — promoção', 'Entrega no mesmo dia na grande SP. Incluso retirada após o prazo.', 'DESTAQUE', 349.90, 399.90, true, 1),
('Caçamba 7m³ especial', 'Ideal para obras médias. Preço promocional por tempo limitado.', 'OFERTA', 459.90, 529.90, true, 2),
('Combo 2x 3m³', 'Duas caçambas pequenas para condomínio ou fachada.', 'COMBO', 580.00, 650.00, true, 3);
