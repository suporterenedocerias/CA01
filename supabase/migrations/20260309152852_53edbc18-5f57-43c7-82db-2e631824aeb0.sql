
-- Add site_settings table
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'CaçambaJá',
  logo_url TEXT DEFAULT '',
  telefone_principal TEXT DEFAULT '',
  whatsapp_principal TEXT DEFAULT '',
  endereco_empresa TEXT DEFAULT '',
  email_contato TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (public site needs it)
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.site_settings (site_name, telefone_principal, whatsapp_principal, email_contato) 
VALUES ('CaçambaJá', '(11) 99999-9999', '5511999999999', 'contato@cacambaja.com');

-- Add peso_distribuicao to whatsapp_numbers
ALTER TABLE public.whatsapp_numbers ADD COLUMN IF NOT EXISTS peso_distribuicao INTEGER NOT NULL DEFAULT 1;

-- Add admin full-access policies for authenticated users
-- whatsapp_numbers: admin can do everything
CREATE POLICY "Authenticated users can manage whatsapp numbers" ON public.whatsapp_numbers 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- whatsapp_clicks: admin can read all
CREATE POLICY "Authenticated users can read whatsapp clicks" ON public.whatsapp_clicks 
  FOR SELECT TO authenticated USING (true);

-- dumpster_sizes: admin can do everything
CREATE POLICY "Authenticated users can manage dumpster sizes" ON public.dumpster_sizes 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_counters: admin can do everything
CREATE POLICY "Authenticated users can manage site counters" ON public.site_counters 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- regions: admin can do everything
CREATE POLICY "Authenticated users can manage regions" ON public.regions 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- leads: admin can read and update
CREATE POLICY "Authenticated users can read leads" ON public.leads 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update leads" ON public.leads 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- site_settings: admin can update
CREATE POLICY "Authenticated users can update site settings" ON public.site_settings 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Also allow reading ALL whatsapp_numbers (including inactive) for admin
-- We need to drop the old select-only-active policy and create two
DROP POLICY IF EXISTS "Anyone can read active whatsapp numbers" ON public.whatsapp_numbers;
CREATE POLICY "Anyone can read active whatsapp numbers" ON public.whatsapp_numbers 
  FOR SELECT TO anon USING (active = true);

-- Same for dumpster_sizes
DROP POLICY IF EXISTS "Anyone can read active dumpster sizes" ON public.dumpster_sizes;
CREATE POLICY "Anyone can read active dumpster sizes" ON public.dumpster_sizes 
  FOR SELECT TO anon USING (active = true);

-- Same for site_counters
DROP POLICY IF EXISTS "Anyone can read active site counters" ON public.site_counters;
CREATE POLICY "Anyone can read active site counters" ON public.site_counters 
  FOR SELECT TO anon USING (active = true);

-- Same for regions
DROP POLICY IF EXISTS "Anyone can read active regions" ON public.regions;
CREATE POLICY "Anyone can read active regions" ON public.regions 
  FOR SELECT TO anon USING (active = true);
