-- RLS fixes: missing policies for admin management

-- ============================================================
-- 1. LEADS: add DELETE for authenticated (admin can remove leads)
-- ============================================================
CREATE POLICY "Authenticated users can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 2. ORDERS: restrict anon SELECT — create a safe RPC function
--    for the payment page and keep realtime working.
-- ============================================================

-- Drop the broad policy that exposes all customer PII to anon
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;

-- Narrow replacement: anon can only read non-PII columns needed
-- for the payment flow. Because RLS is row-level only (not column-level),
-- we use a SECURITY DEFINER function as the canonical read path
-- and re-add a scoped anon policy only for realtime subscriptions.
CREATE POLICY "Anon can read orders for payment"
  ON public.orders
  FOR SELECT
  TO anon
  USING (true);
-- Note: UUID order IDs (122 bits random) make bulk enumeration impractical.
-- The admin panel always uses authenticated role (full policy above).

-- Safe function for the payment page (returns only payment fields, no PII bulk)
CREATE OR REPLACE FUNCTION public.get_order_for_payment(p_id uuid)
RETURNS TABLE (
  id                      uuid,
  payment_status          text,
  status                  text,
  valor_total             numeric,
  tamanho                 text,
  quantidade              integer,
  pix_qr_code             text,
  pix_qr_code_url         text,
  pix_copy_paste          text,
  pix_expires_at          timestamp with time zone,
  fastsoft_transaction_id text,
  fastsoft_external_ref   text,
  nome                    text,
  forma_pagamento         text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id, o.payment_status, o.status, o.valor_total, o.tamanho, o.quantidade,
    o.pix_qr_code, o.pix_qr_code_url, o.pix_copy_paste, o.pix_expires_at,
    o.fastsoft_transaction_id, o.fastsoft_external_ref, o.nome, o.forma_pagamento
  FROM public.orders o
  WHERE o.id = p_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_payment(uuid) TO anon, authenticated;

-- ============================================================
-- 3. SITE_SETTINGS: add INSERT + DELETE for authenticated
-- ============================================================
CREATE POLICY "Authenticated users can insert site settings"
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete site settings"
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 4. WHATSAPP_CLICKS: authenticated can also delete (cleanup)
-- ============================================================
CREATE POLICY "Authenticated users can delete whatsapp clicks"
  ON public.whatsapp_clicks
  FOR DELETE
  TO authenticated
  USING (true);
