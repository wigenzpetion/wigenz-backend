const db = require("../config/db");

const VALID_SCOPES = new Set(["own", "team", "region", "global"]);

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) {
    return null;
  }

  const normalized = scopes
    .map((scope) => String(scope || "").toLowerCase())
    .filter((scope) => VALID_SCOPES.has(scope));

  return normalized.length ? normalized : null;
}

function requirePermission(permissionCode, options = {}) {
  const code = String(permissionCode || "").trim();
  const requestedScopes = normalizeScopes(options.scopes);

  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const jwtRole = String(req.user.role || "").toUpperCase();
      if (jwtRole === "SUPER_ADMIN") {
        return next();
      }

      const result = await db.query(
        `
        SELECT 1
        FROM (
          SELECT ur.role_id
          FROM user_roles ur
          WHERE ur.user_id = $1
          UNION
          SELECT sr.id AS role_id
          FROM system_roles sr
          WHERE sr.role_code = $2
        ) effective_roles
        JOIN role_permissions rp ON rp.role_id = effective_roles.role_id
        JOIN system_permissions sp ON sp.id = rp.permission_id
        WHERE sp.permission_code = $3
          AND ($4::text[] IS NULL OR rp.scope = ANY($4::text[]))
        LIMIT 1
      `,
        [req.user.id, jwtRole, code, requestedScopes]
      );

      if (!result.rows.length) {
        return res.status(403).json({ message: "Access denied" });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requirePermission };
