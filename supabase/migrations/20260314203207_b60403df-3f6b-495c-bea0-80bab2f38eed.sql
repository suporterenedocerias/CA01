create or replace function public.register_weighted_whatsapp_click(
  p_visitor_id text,
  p_page_url text
)
returns table(number_id uuid, number_value text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number_id uuid;
  v_number_value text;
begin
  -- Keep the same active number for returning visitors
  select wn.id, wn.number
    into v_number_id, v_number_value
  from public.whatsapp_clicks wc
  join public.whatsapp_numbers wn on wn.id = wc.number_id
  where wc.visitor_id = p_visitor_id
    and wn.active = true
  order by wc.created_at desc
  limit 1;

  -- New visitor: pick the number with lowest clicks/weight ratio
  if v_number_id is null then
    select wn.id, wn.number
      into v_number_id, v_number_value
    from public.whatsapp_numbers wn
    where wn.active = true
    order by
      (wn.click_count::numeric / greatest(wn.peso_distribuicao, 1)::numeric) asc,
      wn.click_count asc,
      wn.order_index asc
    limit 1;
  end if;

  if v_number_id is null then
    return;
  end if;

  insert into public.whatsapp_clicks (number_id, visitor_id, page_url)
  values (v_number_id, p_visitor_id, p_page_url);

  update public.whatsapp_numbers
  set click_count = click_count + 1
  where id = v_number_id;

  return query
  select v_number_id, v_number_value;
end;
$$;