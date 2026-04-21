-- Rotação de WhatsApp: a cada N "conversões" (novos visitantes que clicam), passa ao próximo número ativo (por order_index).

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS whatsapp_rotate_every integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS whatsapp_new_visitor_seq bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.site_settings.whatsapp_rotate_every IS 'Quantos novos visitantes (cliques únicos) antes de passar ao próximo número na rotação.';
COMMENT ON COLUMN public.site_settings.whatsapp_new_visitor_seq IS 'Contador global (só novos visitantes); usado pela função de rotação.';

CREATE OR REPLACE FUNCTION public.register_weighted_whatsapp_click(
  p_visitor_id text,
  p_page_url text
)
RETURNS TABLE (number_id uuid, number_value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number_id uuid;
  v_number_value text;
  v_rotate_every int;
  v_seq bigint;
  v_slot int;
  v_active_count int;
  v_settings_id uuid;
BEGIN
  -- Visitante que já clicou: mantém o mesmo número
  SELECT wn.id, wn.number
    INTO v_number_id, v_number_value
  FROM public.whatsapp_clicks wc
  JOIN public.whatsapp_numbers wn ON wn.id = wc.number_id
  WHERE wc.visitor_id = p_visitor_id
    AND wn.active = true
  ORDER BY wc.created_at DESC
  LIMIT 1;

  IF v_number_id IS NOT NULL THEN
    INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url)
    VALUES (v_number_id, p_visitor_id, p_page_url);
    UPDATE public.whatsapp_numbers
    SET click_count = click_count + 1
    WHERE id = v_number_id;
    RETURN QUERY SELECT v_number_id, v_number_value;
    RETURN;
  END IF;

  -- Novo visitante: rotação por ordem (order_index) a cada N atribuições
  SELECT id INTO v_settings_id FROM public.site_settings ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
  IF v_settings_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(ss.whatsapp_rotate_every, 5) INTO v_rotate_every
  FROM public.site_settings ss WHERE ss.id = v_settings_id;
  v_rotate_every := GREATEST(v_rotate_every, 1);

  UPDATE public.site_settings
  SET whatsapp_new_visitor_seq = whatsapp_new_visitor_seq + 1
  WHERE id = v_settings_id
  RETURNING whatsapp_new_visitor_seq INTO v_seq;

  SELECT COUNT(*)::int INTO v_active_count FROM public.whatsapp_numbers WHERE active = true;
  IF v_active_count = 0 THEN
    RETURN;
  END IF;

  v_slot := (FLOOR((v_seq - 1)::numeric / v_rotate_every::numeric))::int % v_active_count;

  SELECT wn.id, wn.number INTO v_number_id, v_number_value
  FROM (
    SELECT
      wn2.id,
      wn2.number,
      (ROW_NUMBER() OVER (ORDER BY wn2.order_index ASC, wn2.created_at ASC) - 1)::int AS rn
    FROM public.whatsapp_numbers wn2
    WHERE wn2.active = true
  ) wn
  WHERE wn.rn = v_slot;

  IF v_number_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url)
  VALUES (v_number_id, p_visitor_id, p_page_url);

  UPDATE public.whatsapp_numbers
  SET click_count = click_count + 1
  WHERE id = v_number_id;

  RETURN QUERY SELECT v_number_id, v_number_value;
END;
$$;
