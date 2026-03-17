
-- Function to atomically increment click count and register click
CREATE OR REPLACE FUNCTION public.register_whatsapp_click(
  p_number_id UUID,
  p_visitor_id TEXT,
  p_page_url TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert click record
  INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url)
  VALUES (p_number_id, p_visitor_id, p_page_url);
  
  -- Atomically increment click_count
  UPDATE public.whatsapp_numbers
  SET click_count = click_count + 1
  WHERE id = p_number_id;
END;
$$;

-- Function to get click stats per number
CREATE OR REPLACE FUNCTION public.get_click_stats()
RETURNS TABLE(
  number_id UUID,
  number_label TEXT,
  number_value TEXT,
  total_clicks BIGINT,
  clicks_today BIGINT,
  clicks_week BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wn.id as number_id,
    wn.label as number_label,
    wn.number as number_value,
    COUNT(wc.id) as total_clicks,
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE) as clicks_today,
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE - INTERVAL '7 days') as clicks_week
  FROM public.whatsapp_numbers wn
  LEFT JOIN public.whatsapp_clicks wc ON wc.number_id = wn.id
  WHERE wn.active = true
  GROUP BY wn.id, wn.label, wn.number
  ORDER BY total_clicks DESC;
$$;
