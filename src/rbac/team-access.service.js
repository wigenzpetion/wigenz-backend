const db = require("../config/db");
const AppError = require("../core/errors");

function normalizeRole(role) {
  return String(role || "").toUpperCase();
}

async function hasActiveTeamMembership(userId, teamCode) {
  const result = await db.query(
    `
    SELECT 1
    FROM user_team_memberships m
    JOIN teams t ON t.id = m.team_id
    WHERE m.user_id = $1
      AND UPPER(t.team_code) = UPPER($2)
      AND m.ends_at IS NULL
      AND t.is_active = TRUE
    LIMIT 1
    `,
    [userId, teamCode]
  );

  return result.rows.length > 0;
}

async function ensureTeamAccess(currentUser, options = {}) {
  const teamCode = String(options.teamCode || "").trim().toUpperCase();
  if (!teamCode) {
    throw new AppError("teamCode is required", 500);
  }

  if (!currentUser?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const role = normalizeRole(currentUser.role);
  const privilegedRoles = (options.privilegedRoles || ["SUPER_ADMIN", "ADMIN"]).map(normalizeRole);
  const enforcedRoles = (options.enforcedRoles || []).map(normalizeRole);

  if (privilegedRoles.includes(role)) {
    return true;
  }

  if (enforcedRoles.length && !enforcedRoles.includes(role)) {
    return true;
  }

  const ok = await hasActiveTeamMembership(currentUser.id, teamCode);
  if (!ok) {
    throw new AppError(`${teamCode} team relation required`, 403);
  }

  return true;
}

module.exports = {
  hasActiveTeamMembership,
  ensureTeamAccess
};
