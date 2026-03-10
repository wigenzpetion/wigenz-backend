const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../src/config/db");

function printUsage() {
  console.log(`
Usage:
  npm run rbac:assign -- --email <email> --roles <ROLE1,ROLE2> [--mode replace|append] [--sync-legacy-role]
  npm run rbac:assign -- --file <path/to/assignments.json> [--mode replace|append] [--sync-legacy-role]

Examples:
  npm run rbac:assign -- --email finance@wigenz.test --roles FINANCE_ADMIN
  npm run rbac:assign -- --file config/rbac/role-assignments.example.json --sync-legacy-role
`);
}

function parseArgs(argv) {
  const options = {
    mode: "replace",
    syncLegacyRole: false,
    email: null,
    roles: null,
    file: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--email") {
      options.email = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--roles") {
      options.roles = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--file") {
      options.file = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--mode") {
      options.mode = String(argv[i + 1] || "").toLowerCase();
      i += 1;
      continue;
    }
    if (arg === "--sync-legacy-role") {
      options.syncLegacyRole = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeRoles(roles) {
  const arr = Array.isArray(roles)
    ? roles
    : String(roles || "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

  return [...new Set(arr.map((role) => String(role).toUpperCase()))];
}

function resolveAssignments(options) {
  if (options.file) {
    const filePath = path.resolve(process.cwd(), options.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Assignments file not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const assignments = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.assignments)
        ? parsed.assignments
        : [];

    if (!assignments.length) {
      throw new Error("Assignments file is empty.");
    }

    return assignments.map((item) => ({
      email: String(item.email || "").trim().toLowerCase(),
      roles: normalizeRoles(item.roles),
      primaryRole: item.primaryRole ? String(item.primaryRole).toUpperCase() : null
    }));
  }

  if (!options.email || !options.roles) {
    throw new Error("Missing --email or --roles.");
  }

  return [
    {
      email: String(options.email).trim().toLowerCase(),
      roles: normalizeRoles(options.roles),
      primaryRole: null
    }
  ];
}

async function loadRoleMap() {
  const result = await db.query("SELECT id, role_code FROM system_roles");
  const roleMap = new Map();
  for (const row of result.rows) {
    roleMap.set(String(row.role_code).toUpperCase(), row.id);
  }
  return roleMap;
}

async function applyAssignment(assignment, roleMap, options) {
  if (!assignment.email) {
    throw new Error("Assignment email is required.");
  }

  if (!assignment.roles.length) {
    throw new Error(`No roles provided for ${assignment.email}`);
  }

  const missingRoles = assignment.roles.filter((role) => !roleMap.has(role));
  if (missingRoles.length) {
    throw new Error(
      `Unknown roles for ${assignment.email}: ${missingRoles.join(", ")}`
    );
  }

  const userResult = await db.query(
    "SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1)",
    [assignment.email]
  );

  const user = userResult.rows[0];
  if (!user) {
    throw new Error(`User not found: ${assignment.email}`);
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    if (options.mode === "replace") {
      await client.query("DELETE FROM user_roles WHERE user_id = $1", [user.id]);
    }

    for (const roleCode of assignment.roles) {
      await client.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [user.id, roleMap.get(roleCode)]
      );
    }

    if (options.syncLegacyRole) {
      const primaryRole = assignment.primaryRole || assignment.roles[0];
      await client.query(
        "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
        [primaryRole, user.id]
      );
    }

    await client.query("COMMIT");

    return {
      userId: user.id,
      email: user.email,
      previousLegacyRole: user.role,
      assignedRoles: assignment.roles
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (!["replace", "append"].includes(options.mode)) {
    throw new Error(`Invalid --mode value: ${options.mode}`);
  }

  const assignments = resolveAssignments(options);
  const roleMap = await loadRoleMap();

  const successes = [];
  const failures = [];

  for (const assignment of assignments) {
    try {
      const result = await applyAssignment(assignment, roleMap, options);
      successes.push(result);
      console.log(
        `OK ${result.email} -> ${result.assignedRoles.join(", ")}`
      );
    } catch (error) {
      failures.push({ assignment, error: error.message });
      console.error(`FAILED ${assignment.email}: ${error.message}`);
    }
  }

  console.log("\nSummary");
  console.log(`  Success: ${successes.length}`);
  console.log(`  Failed:  ${failures.length}`);

  if (successes.length) {
    console.log("\nApplied:");
    for (const item of successes) {
      console.log(
        `  - user_id=${item.userId} email=${item.email} roles=${item.assignedRoles.join("|")}`
      );
    }
  }

  if (failures.length) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    printUsage();
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db.pool) {
      await db.pool.end();
    }
  });
