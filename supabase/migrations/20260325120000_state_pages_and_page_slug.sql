-- Páginas regionais (/e/:slug) e rastreio de pedidos/leads por origem
CREATE TABLE IF NOT EXISTS public.state_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  slug text NOT NULL,
  name text NOT NULL,
  uf text NULL,
  notes text NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT state_pages_slug_unique UNIQUE (slug)
);

ALTER TABLE public.state_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active state pages"
  ON public.state_pages FOR SELECT
  USING (active = true);

CREATE POLICY "Authenticated users can manage state_pages"
  ON public.state_pages FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_state_pages_updated_at
  BEFORE UPDATE ON public.state_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS page_slug text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS page_slug text NULL;
