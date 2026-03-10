-- ReBAC bootstrap for Finance domain:
-- Backfill finance team membership for existing finance users.

BEGIN;

WITH finance_team AS (
  SELECT id
  FROM teams
  WHERE team_code = 'FINANCE'
  LIMIT 1
),
eligible_users AS (
  SELECT DISTINCT u.id AS user_id, UPPER(u.role) AS role_code
  FROM users u
  WHERE UPPER(u.role) = 'FINANCE_ADMIN'

  UNION

  SELECT DISTINCT ur.user_id, sr.role_code
  FROM user_roles ur
  JOIN system_roles sr ON sr.id = ur.role_id
  WHERE sr.role_code = 'FINANCE_ADMIN'
)
INSERT INTO user_team_memberships (user_id, team_id, membership_role, is_primary)
SELECT eu.user_id, ft.id, 'MEMBER', TRUE
FROM eligible_users eu
CROSS JOIN finance_team ft
WHERE NOT EXISTS (
  SELECT 1
  FROM user_team_memberships m
  WHERE m.user_id = eu.user_id
    AND m.team_id = ft.id
    AND m.ends_at IS NULL
);

COMMIT;
