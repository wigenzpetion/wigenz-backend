-- Idempotency guard for payout scheduling:
-- ensure one queue row per order.
CREATE UNIQUE INDEX IF NOT EXISTS ux_driver_payout_queue_order_id
ON driver_payout_queue (order_id);
