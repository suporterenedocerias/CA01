-- Adiciona coluna para o ID de pagamento Koliseu (substitui fastsoft_transaction_id)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS koliseu_payment_id text;

CREATE INDEX IF NOT EXISTS orders_koliseu_payment_id_idx
  ON orders (koliseu_payment_id)
  WHERE koliseu_payment_id IS NOT NULL;
