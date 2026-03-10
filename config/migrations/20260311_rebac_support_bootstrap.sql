-- ReBAC bootstrap for Support domain:
-- Backfill support team membership for existing support users.

BEGIN;

WITH support_team AS (
  SELECT id
  FROM teams
  WHERE team_code = 'SUPPORT'
  LIMIT 1
),
eligible_users AS (
  SELECT DISTINCT u.id AS user_id, UPPER(u.role) AS legacy_role
  FROM users u
  WHERE UPPER(u.role) IN ('SUPPORT', 'SUPPORT_AGENT', 'SUPPORT_ADMIN')

  UNION

  SELECT DISTINCT ur.user_id, sr.role_code AS legacy_role
  FROM user_roles ur
  JOIN system_roles sr ON sr.id = ur.role_id
  WHERE sr.role_code IN ('SUPPORT', 'SUPPORT_AGENT', 'SUPPORT_ADMIN')
),
prepared AS (
  SELECT
    eu.user_id,
    st.id AS team_id,
    CASE
      WHEN eu.legacy_role IN ('SUPPORT_ADMIN', 'SUPPORT') THEN 'LEAD'
      ELSE 'AGENT'
    END AS membership_role
  FROM eligible_users eu
  CROSS JOIN support_team st
)
INSERT INTO user_team_memberships (user_id, team_id, membership_role, is_primary)
SELECT p.user_id, p.team_id, p.membership_role, TRUE
FROM prepared p
WHERE NOT EXISTS (
  SELECT 1
  FROM user_team_memberships m
  WHERE m.user_id = p.user_id
    AND m.team_id = p.team_id
    AND m.ends_at IS NULL
);

COMMIT;
