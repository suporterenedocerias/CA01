
ALTER TABLE public.orders RENAME COLUMN pagarme_order_id TO fastsoft_transaction_id;
ALTER TABLE public.orders RENAME COLUMN pagarme_charge_id TO fastsoft_external_ref;
