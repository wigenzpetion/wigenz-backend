-- RBAC v2: normalized permissions + scopes + admin action audit log.
-- Safe for repeated execution.

BEGIN;

ALTER TABLE role_permissions
ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'global';

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(120),
  scope VARCHAR(20) NOT NULL DEFAULT 'global',
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_admin_action_logs_actor_user_id
  ON admin_action_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS ix_admin_action_logs_created_at
  ON admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_admin_action_logs_action
  ON admin_action_logs(action);

INSERT INTO system_roles (role_code)
VALUES
  ('TECH_ADMIN'),
  ('FINANCE_ADMIN'),
  ('SUPPORT_AGENT'),
  ('SUPPORT_ADMIN'),
  ('RISK_ADMIN'),
  ('OPERATIONS_ADMIN'),
  ('HR_ADMIN')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO system_permissions (permission_code)
VALUES
  ('users.view'),
  ('users.update'),
  ('users.block'),
  ('users.unblock'),
  ('users.impersonate'),
  ('drivers.view'),
  ('drivers.approve'),
  ('drivers.reject'),
  ('drivers.suspend'),
  ('drivers.unsuspend'),
  ('drivers.block'),
  ('drivers.unblock'),
  ('drivers.assign_region'),
  ('drivers.view_documents'),
  ('orders.view'),
  ('orders.create'),
  ('orders.cancel'),
  ('orders.update_status'),
  ('orders.reassign_driver'),
  ('dispatch.view'),
  ('dispatch.assign'),
  ('dispatch.retry'),
  ('dispatch.reassign_force'),
  ('payments.view'),
  ('payments.capture'),
  ('payments.refund'),
  ('payments.export'),
  ('payouts.view'),
  ('payouts.approve'),
  ('payouts.reject'),
  ('payouts.hold'),
  ('payouts.release'),
  ('tickets.view'),
  ('tickets.create'),
  ('tickets.assign'),
  ('tickets.resolve'),
  ('tickets.close'),
  ('tickets.escalate'),
  ('risk.view'),
  ('risk.flag_account'),
  ('risk.freeze_account'),
  ('risk.unfreeze_account'),
  ('risk.review_case'),
  ('documents.view'),
  ('documents.approve'),
  ('documents.reject'),
  ('pricing.view'),
  ('pricing.edit'),
  ('pricing.override'),
  ('notifications.view'),
  ('notifications.send'),
  ('notifications.retry'),
  ('audit.view'),
  ('audit.export'),
  ('logs.view'),
  ('config.view'),
  ('config.edit'),
  ('integrations.manage'),
  ('feature_flags.manage'),
  ('roles.view'),
  ('roles.assign'),
  ('roles.revoke'),
  ('refund_requests.view'),
  ('refund_requests.approve'),
  ('refund_requests.reject'),
  ('hr.employee.view'),
  ('hr.employee.create'),
  ('hr.employee.update'),
  ('hr.employee.terminate'),
  ('hr.team.view'),
  ('hr.team.create'),
  ('hr.team.update'),
  ('hr.team.assign_member'),
  ('hr.contract.view'),
  ('hr.contract.update'),
  ('hr.documents.view'),
  ('hr.documents.approve'),
  ('hr.documents.reject')
ON CONFLICT (permission_code) DO NOTHING;

WITH role_map(role_code, permission_code, scope) AS (
  VALUES
    -- SUPER_ADMIN (all permissions, global)
    ('SUPER_ADMIN', '*', 'global'),

    -- TECH_ADMIN
    ('TECH_ADMIN', 'logs.view', 'global'),
    ('TECH_ADMIN', 'audit.view', 'global'),
    ('TECH_ADMIN', 'config.view', 'global'),
    ('TECH_ADMIN', 'config.edit', 'global'),
    ('TECH_ADMIN', 'integrations.manage', 'global'),
    ('TECH_ADMIN', 'feature_flags.manage', 'global'),
    ('TECH_ADMIN', 'notifications.retry', 'global'),

    -- FINANCE_ADMIN
    ('FINANCE_ADMIN', 'payments.view', 'global'),
    ('FINANCE_ADMIN', 'payments.capture', 'global'),
    ('FINANCE_ADMIN', 'payments.refund', 'global'),
    ('FINANCE_ADMIN', 'payments.export', 'global'),
    ('FINANCE_ADMIN', 'payouts.view', 'global'),
    ('FINANCE_ADMIN', 'payouts.approve', 'global'),
    ('FINANCE_ADMIN', 'payouts.reject', 'global'),
    ('FINANCE_ADMIN', 'payouts.hold', 'global'),
    ('FINANCE_ADMIN', 'payouts.release', 'global'),
    ('FINANCE_ADMIN', 'refund_requests.view', 'global'),
    ('FINANCE_ADMIN', 'refund_requests.approve', 'global'),
    ('FINANCE_ADMIN', 'refund_requests.reject', 'global'),
    ('FINANCE_ADMIN', 'audit.view', 'global'),
    ('FINANCE_ADMIN', 'audit.export', 'global'),

    -- SUPPORT_AGENT
    ('SUPPORT_AGENT', 'tickets.view', 'own'),
    ('SUPPORT_AGENT', 'tickets.create', 'own'),
    ('SUPPORT_AGENT', 'tickets.assign', 'team'),
    ('SUPPORT_AGENT', 'tickets.resolve', 'own'),
    ('SUPPORT_AGENT', 'tickets.close', 'own'),
    ('SUPPORT_AGENT', 'orders.view', 'region'),
    ('SUPPORT_AGENT', 'users.view', 'region'),

    -- SUPPORT_ADMIN
    ('SUPPORT_ADMIN', 'tickets.view', 'team'),
    ('SUPPORT_ADMIN', 'tickets.create', 'team'),
    ('SUPPORT_ADMIN', 'tickets.assign', 'team'),
    ('SUPPORT_ADMIN', 'tickets.resolve', 'team'),
    ('SUPPORT_ADMIN', 'tickets.close', 'team'),
    ('SUPPORT_ADMIN', 'tickets.escalate', 'region'),
    ('SUPPORT_ADMIN', 'orders.view', 'region'),
    ('SUPPORT_ADMIN', 'users.view', 'region'),

    -- RISK_ADMIN
    ('RISK_ADMIN', 'risk.view', 'global'),
    ('RISK_ADMIN', 'risk.flag_account', 'global'),
    ('RISK_ADMIN', 'risk.freeze_account', 'global'),
    ('RISK_ADMIN', 'risk.unfreeze_account', 'global'),
    ('RISK_ADMIN', 'risk.review_case', 'global'),
    ('RISK_ADMIN', 'drivers.view', 'region'),
    ('RISK_ADMIN', 'drivers.suspend', 'region'),
    ('RISK_ADMIN', 'drivers.block', 'global'),
    ('RISK_ADMIN', 'users.block', 'global'),
    ('RISK_ADMIN', 'users.unblock', 'global'),
    ('RISK_ADMIN', 'audit.view', 'global'),

    -- OPERATIONS_ADMIN
    ('OPERATIONS_ADMIN', 'orders.view', 'region'),
    ('OPERATIONS_ADMIN', 'orders.cancel', 'region'),
    ('OPERATIONS_ADMIN', 'orders.update_status', 'region'),
    ('OPERATIONS_ADMIN', 'orders.reassign_driver', 'region'),
    ('OPERATIONS_ADMIN', 'dispatch.view', 'region'),
    ('OPERATIONS_ADMIN', 'dispatch.assign', 'region'),
    ('OPERATIONS_ADMIN', 'dispatch.retry', 'region'),
    ('OPERATIONS_ADMIN', 'dispatch.reassign_force', 'region'),
    ('OPERATIONS_ADMIN', 'drivers.view', 'region'),
    ('OPERATIONS_ADMIN', 'drivers.assign_region', 'region'),
    ('OPERATIONS_ADMIN', 'documents.view', 'region'),

    -- HR_ADMIN
    ('HR_ADMIN', 'hr.employee.view', 'region'),
    ('HR_ADMIN', 'hr.employee.create', 'region'),
    ('HR_ADMIN', 'hr.employee.update', 'region'),
    ('HR_ADMIN', 'hr.employee.terminate', 'region'),
    ('HR_ADMIN', 'hr.team.view', 'team'),
    ('HR_ADMIN', 'hr.team.create', 'team'),
    ('HR_ADMIN', 'hr.team.update', 'team'),
    ('HR_ADMIN', 'hr.team.assign_member', 'team'),
    ('HR_ADMIN', 'hr.contract.view', 'region'),
    ('HR_ADMIN', 'hr.contract.update', 'region'),
    ('HR_ADMIN', 'hr.documents.view', 'region'),
    ('HR_ADMIN', 'hr.documents.approve', 'region'),
    ('HR_ADMIN', 'hr.documents.reject', 'region'),

    -- Legacy role compatibility
    ('ADMIN', 'users.view', 'global'),
    ('ADMIN', 'users.update', 'global'),
    ('ADMIN', 'users.block', 'global'),
    ('ADMIN', 'users.unblock', 'global'),
    ('ADMIN', 'drivers.view', 'global'),
    ('ADMIN', 'drivers.approve', 'global'),
    ('ADMIN', 'drivers.reject', 'global'),
    ('ADMIN', 'drivers.suspend', 'global'),
    ('ADMIN', 'drivers.unsuspend', 'global'),
    ('ADMIN', 'drivers.assign_region', 'global'),
    ('ADMIN', 'orders.view', 'global'),
    ('ADMIN', 'orders.cancel', 'global'),
    ('ADMIN', 'orders.update_status', 'global'),
    ('ADMIN', 'orders.reassign_driver', 'global'),
    ('ADMIN', 'dispatch.view', 'global'),
    ('ADMIN', 'dispatch.assign', 'global'),
    ('ADMIN', 'dispatch.retry', 'global'),
    ('ADMIN', 'dispatch.reassign_force', 'global'),
    ('ADMIN', 'payments.view', 'global'),
    ('ADMIN', 'payments.refund', 'global'),
    ('ADMIN', 'payments.export', 'global'),
    ('ADMIN', 'payouts.view', 'global'),
    ('ADMIN', 'payouts.approve', 'global'),
    ('ADMIN', 'payouts.reject', 'global'),
    ('ADMIN', 'tickets.view', 'global'),
    ('ADMIN', 'tickets.assign', 'global'),
    ('ADMIN', 'tickets.resolve', 'global'),
    ('ADMIN', 'tickets.close', 'global'),
    ('ADMIN', 'tickets.escalate', 'global'),
    ('ADMIN', 'risk.view', 'global'),
    ('ADMIN', 'risk.review_case', 'global'),
    ('ADMIN', 'audit.view', 'global'),
    ('ADMIN', 'audit.export', 'global'),

    ('SUPPORT', 'tickets.view', 'team'),
    ('SUPPORT', 'tickets.create', 'team'),
    ('SUPPORT', 'tickets.assign', 'team'),
    ('SUPPORT', 'tickets.resolve', 'team'),
    ('SUPPORT', 'tickets.close', 'team'),
    ('SUPPORT', 'orders.view', 'region'),
    ('SUPPORT', 'users.view', 'region'),

    ('CLIENT', 'orders.create', 'own'),
    ('CLIENT', 'orders.view', 'own'),
    ('CLIENT', 'tickets.create', 'own'),
    ('CLIENT', 'tickets.view', 'own')
),
expanded AS (
  SELECT
    rm.role_code,
    CASE
      WHEN rm.permission_code = '*' THEN sp.permission_code
      ELSE rm.permission_code
    END AS permission_code,
    rm.scope
  FROM role_map rm
  JOIN system_permissions sp
    ON rm.permission_code = '*' OR sp.permission_code = rm.permission_code
),
resolved AS (
  SELECT
    sr.id AS role_id,
    sp.id AS permission_id,
    e.scope
  FROM expanded e
  JOIN system_roles sr ON sr.role_code = e.role_code
  JOIN system_permissions sp ON sp.permission_code = e.permission_code
)
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT role_id, permission_id, scope
FROM resolved
ON CONFLICT (role_id, permission_id) DO UPDATE
SET scope = EXCLUDED.scope;

COMMIT;
