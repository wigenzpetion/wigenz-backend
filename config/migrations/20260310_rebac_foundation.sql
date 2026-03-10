-- ReBAC foundation (non-breaking): relationship tables for future policy checks.
-- This migration does not change current RBAC/ABAC runtime behavior.

BEGIN;

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_code VARCHAR(80) UNIQUE NOT NULL,
  team_name VARCHAR(120) NOT NULL,
  team_type VARCHAR(80) NOT NULL,
  region_code VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_team_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  membership_role VARCHAR(40) NOT NULL DEFAULT 'MEMBER',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_user_team_memberships_user_id
  ON user_team_memberships(user_id);
CREATE INDEX IF NOT EXISTS ix_user_team_memberships_team_id
  ON user_team_memberships(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_team_memberships_active
  ON user_team_memberships(user_id, team_id)
  WHERE ends_at IS NULL;

CREATE TABLE IF NOT EXISTS user_manager_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation_type VARCHAR(40) NOT NULL DEFAULT 'LINE_MANAGER',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_manager_not_same CHECK (user_id <> manager_user_id)
);

CREATE INDEX IF NOT EXISTS ix_user_manager_links_user_id
  ON user_manager_links(user_id);
CREATE INDEX IF NOT EXISTS ix_user_manager_links_manager_user_id
  ON user_manager_links(manager_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_manager_links_active
  ON user_manager_links(user_id, manager_user_id, relation_type)
  WHERE ends_at IS NULL;

CREATE TABLE IF NOT EXISTS resource_assignments (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(80) NOT NULL,
  resource_id BIGINT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation VARCHAR(80) NOT NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_resource_assignments_resource
  ON resource_assignments(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS ix_resource_assignments_user_id
  ON resource_assignments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_resource_assignments_active
  ON resource_assignments(resource_type, resource_id, user_id, relation)
  WHERE ends_at IS NULL;

-- Seed core teams for admin domains (safe if re-run).
INSERT INTO teams (team_code, team_name, team_type)
VALUES
  ('SUPPORT', 'Support Team', 'SUPPORT'),
  ('OPERATIONS', 'Operations Team', 'OPERATIONS'),
  ('RISK', 'Risk Team', 'RISK'),
  ('FINANCE', 'Finance Team', 'FINANCE'),
  ('TECH', 'Tech Team', 'TECH'),
  ('HR', 'HR Team', 'HR')
ON CONFLICT (team_code) DO NOTHING;

-- Backfill support ticket assignees into relationship graph for future ReBAC checks.
INSERT INTO resource_assignments (resource_type, resource_id, user_id, relation, metadata)
SELECT
  'support_ticket'::VARCHAR(80) AS resource_type,
  st.id::BIGINT AS resource_id,
  st.assigned_to AS user_id,
  'ASSIGNEE'::VARCHAR(80) AS relation,
  jsonb_build_object('source', 'support_tickets.assigned_to')
FROM support_tickets st
WHERE st.assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
