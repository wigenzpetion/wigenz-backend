-- Core schema required by current backend modules.
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT).

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(120),
  push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);
CREATE INDEX IF NOT EXISTS ix_users_created_at ON users(created_at DESC);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  push_token TEXT,
  vehicle_type VARCHAR(120),
  vehicle_plate VARCHAR(120),
  license_number VARCHAR(120),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  fraud_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'INACTIVE',
  subscription_end TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  subscription_expiry_date TIMESTAMPTZ,
  subscription_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  available_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  held_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS ix_drivers_subscription_status ON drivers(subscription_status);
CREATE INDEX IF NOT EXISTS ix_drivers_fraud_score ON drivers(fraud_score DESC);

CREATE OR REPLACE FUNCTION set_driver_id_from_user_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_set_driver_id_from_user_id'
  ) THEN
    CREATE TRIGGER trg_set_driver_id_from_user_id
    BEFORE INSERT ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION set_driver_id_from_user_id();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_address TEXT,
  pickup_lat NUMERIC(10,7),
  pickup_lng NUMERIC(10,7),
  delivery_address TEXT,
  delivery_lat NUMERIC(10,7),
  delivery_lng NUMERIC(10,7),
  destination_lat NUMERIC(10,7),
  destination_lng NUMERIC(10,7),
  status VARCHAR(80) NOT NULL DEFAULT 'CREATED',
  driver_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS ix_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS ix_orders_user_id ON orders(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS ix_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS ix_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  payment_method VARCHAR(50),
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payouts_driver_id ON payouts(driver_id);
CREATE INDEX IF NOT EXISTS ix_payouts_status ON payouts(status);

CREATE TABLE IF NOT EXISTS driver_payout_queue (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS ix_driver_payout_queue_status ON driver_payout_queue(status);
CREATE INDEX IF NOT EXISTS ix_driver_payout_queue_delivered_at ON driver_payout_queue(delivered_at);

CREATE TABLE IF NOT EXISTS driver_locations (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_availability (
  driver_id INTEGER PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  geohash_prefix VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_driver_availability_geohash ON driver_availability(geohash_prefix);

CREATE TABLE IF NOT EXISTS delivery_proofs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  photo_url TEXT,
  signature_url TEXT,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  gps_accuracy NUMERIC(10,2),
  distance_from_destination NUMERIC(12,2),
  gps_valid BOOLEAN NOT NULL DEFAULT FALSE,
  device_id VARCHAR(255),
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_delivery_proofs_driver_id ON delivery_proofs(driver_id);
CREATE INDEX IF NOT EXISTS ix_delivery_proofs_order_id ON delivery_proofs(order_id);

CREATE TABLE IF NOT EXISTS delivery_otps (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  otp_code VARCHAR(20) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_delivery_otps_order_id ON delivery_otps(order_id);

CREATE TABLE IF NOT EXISTS cancellation_fees (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  type VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  related_id INTEGER,
  type VARCHAR(80) NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(120) NOT NULL,
  user_id INTEGER,
  role VARCHAR(50),
  entity_type VARCHAR(120),
  entity_id INTEGER,
  amount NUMERIC(14,2),
  previous_balance NUMERIC(14,2),
  new_balance NUMERIC(14,2),
  status VARCHAR(80),
  fraud_score NUMERIC(10,2),
  ip_address VARCHAR(100),
  user_agent TEXT,
  previous_hash TEXT,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  action VARCHAR(120) NOT NULL,
  target_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_export_requests (
  id SERIAL PRIMARY KEY,
  requested_by INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  approved_by INTEGER,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_export_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fintech_accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fintech_ledger_entries (
  id SERIAL PRIMARY KEY,
  reference_id INTEGER NOT NULL,
  reference_type VARCHAR(80) NOT NULL,
  debit_account_id INTEGER NOT NULL REFERENCES fintech_accounts(id),
  credit_account_id INTEGER NOT NULL REFERENCES fintech_accounts(id),
  amount NUMERIC(14,2) NOT NULL,
  previous_hash TEXT,
  hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_fintech_ledger_entries_ref ON fintech_ledger_entries(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id SERIAL PRIMARY KEY,
  reference_type VARCHAR(80),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_daily_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  last_entry_id INTEGER,
  snapshot_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_roles (
  id SERIAL PRIMARY KEY,
  role_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_permissions (
  id SERIAL PRIMARY KEY,
  permission_code VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES system_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(120) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_subscriptions (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  phase VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  retry_count INTEGER NOT NULL DEFAULT 0,
  grace_period_until TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  pause_effective_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_driver_subscriptions_phase ON driver_subscriptions(phase);

CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  order_id INTEGER,
  subject VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_roles (role_code)
VALUES
  ('SUPER_ADMIN'),
  ('ADMIN'),
  ('SUPPORT'),
  ('DRIVER'),
  ('CLIENT')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO system_permissions (permission_code)
VALUES
  ('FINANCE_EXPORT'),
  ('MANAGE_DRIVERS'),
  ('MANAGE_SUPPORT'),
  ('MANAGE_RISK')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO system_settings (key, value, updated_at)
VALUES ('driver_monthly_subscription_price', '50', NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO fintech_accounts (id, account_name)
VALUES
  (1, 'PLATFORM_CASH'),
  (2, 'DRIVER_WALLET'),
  (3, 'CLIENT_WALLET'),
  (4, 'SUBSCRIPTION_REVENUE')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('fintech_accounts', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM fintech_accounts), 1),
  TRUE
);

CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_create_wallet_for_new_user'
  ) THEN
    CREATE TRIGGER trg_create_wallet_for_new_user
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_new_user();
  END IF;
END $$;

COMMIT;
