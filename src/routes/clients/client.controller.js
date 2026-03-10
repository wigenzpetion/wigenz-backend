const db = require("../../config/db");
const AppError = require("../../core/errors");
const eventBus = require("../../core/eventBus");

const ALLOWED_PROFILE_FIELDS = ["name", "phone", "address", "city"];
const ALLOWED_ROLES = ["CLIENT", "DRIVER", "SUPPORT", "ADMIN", "SUPER_ADMIN"];

let userColumnsCache = null;

async function getUserColumns() {
  if (userColumnsCache) {
    return userColumnsCache;
  }

  const result = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`
  );
  userColumnsCache = new Set(result.rows.map((r) => r.column_name));
  return userColumnsCache;
}

function pickSuspendColumn(columns) {
  if (columns.has("status")) return "status";
  if (columns.has("is_active")) return "is_active";
  if (columns.has("active")) return "active";
  if (columns.has("suspended")) return "suspended";
  return null;
}

function sanitizeUser(row) {
  if (!row) return null;

  const fields = [
    "id",
    "name",
    "email",
    "role",
    "status",
    "is_active",
    "active",
    "suspended",
    "phone",
    "address",
    "city",
    "created_at",
    "updated_at"
  ];

  const out = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(row, field)) {
      out[field] = row[field];
    }
  }
  return out;
}

async function fetchUserById(id) {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM users
       ORDER BY id DESC`
    );
    res.json(result.rows.map(sanitizeUser));
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await fetchUserById(req.params.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
};

exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await fetchUserById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const userColumns = await getUserColumns();
    const allowedColumns = ALLOWED_PROFILE_FIELDS.filter((field) =>
      userColumns.has(field)
    );

    const payload = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key, value]) =>
        allowedColumns.includes(key) && value !== undefined
      )
    );

    const keys = Object.keys(payload);
    if (!keys.length) {
      throw new AppError("No updatable fields provided", 400);
    }

    const assignments = keys.map((key, index) => `"${key}" = $${index + 1}`);
    const values = keys.map((key) => payload[key]);
    values.push(req.user.id);

    const result = await db.query(
      `UPDATE users
       SET ${assignments.join(", ")}, updated_at = NOW()
       WHERE id = $${keys.length + 1}
       RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      throw new AppError("User not found", 404);
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const role = String(req.body?.role || "").toUpperCase();
    if (!ALLOWED_ROLES.includes(role)) {
      throw new AppError("Invalid role", 400);
    }

    const result = await db.query(
      `UPDATE users
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [role, req.params.id]
    );

    if (!result.rows[0]) {
      throw new AppError("User not found", 404);
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.suspendUser = async (req, res, next) => {
  try {
    const userColumns = await getUserColumns();
    const column = pickSuspendColumn(userColumns);
    if (!column) {
      throw new AppError("Suspend not configured for users schema", 501);
    }

    let suspendValue = "SUSPENDED";
    if (column === "is_active" || column === "active") {
      suspendValue = false;
    }
    if (column === "suspended") {
      suspendValue = true;
    }

    const result = await db.query(
      `UPDATE users
       SET ${column} = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [suspendValue, req.params.id]
    );

    if (!result.rows[0]) {
      throw new AppError("User not found", 404);
    }

    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id, name, email, role`,
      [req.params.id]
    );

    const deleted = result.rows[0];
    if (!deleted) {
      throw new AppError("User not found", 404);
    }

    eventBus.emit("USER_DELETED", {
      actorId: req.user.id,
      actorRole: req.user.role,
      targetId: deleted.id
    });

    res.json({ message: "User deleted", user: sanitizeUser(deleted) });
  } catch (err) {
    next(err);
  }
};
