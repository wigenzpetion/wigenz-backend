ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_payments_user_idempotency'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT uq_payments_user_idempotency
      UNIQUE (user_id, idempotency_key);
  END IF;
END $$;
