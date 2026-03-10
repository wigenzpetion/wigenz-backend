const http = require("http");
const assert = require("assert/strict");

require("dotenv").config();

const app = require("../src/app");
const db = require("../src/config/db");

const PASSWORD = "StrongPass#123";

let server;
let port;

function request(method, path, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          ...(payload ? { "Content-Type": "application/json" } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let data = raw;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            // Keep raw response body.
          }
          resolve({ status: res.statusCode, data, raw });
        });
      }
    );
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function registerAndLogin(label) {
  const email = `${label}_${Date.now()}_${Math.floor(Math.random() * 10000)}@wigenz.test`;

  const registerRes = await request("POST", "/api/auth/register", {
    body: {
      name: label,
      email,
      password: PASSWORD
    }
  });
  assert.equal(registerRes.status, 201);

  const loginRes = await request("POST", "/api/auth/login", {
    body: {
      email,
      password: PASSWORD
    }
  });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.data.accessToken);

  return {
    userId: loginRes.data.user.id,
    email,
    token: loginRes.data.accessToken
  };
}

async function assignRole(userId, roleCode) {
  await db.query(
    "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
    [roleCode, userId]
  );

  const roleRes = await db.query(
    "SELECT id FROM system_roles WHERE role_code = $1 LIMIT 1",
    [roleCode]
  );
  assert.ok(roleRes.rows[0], `Missing system role ${roleCode}`);

  await db.query(
    `
    INSERT INTO user_roles (user_id, role_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
    [userId, roleRes.rows[0].id]
  );
}

async function setFinanceMembership(userId, enabled) {
  const teamRes = await db.query(
    "SELECT id FROM teams WHERE team_code = 'FINANCE' LIMIT 1"
  );
  assert.ok(teamRes.rows[0], "Missing FINANCE team");
  const teamId = teamRes.rows[0].id;

  if (enabled) {
    await db.query(
      `
      INSERT INTO user_team_memberships (user_id, team_id, membership_role, is_primary)
      SELECT $1, $2, 'MEMBER', TRUE
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_team_memberships
        WHERE user_id = $1
          AND team_id = $2
          AND ends_at IS NULL
      )
      `,
      [userId, teamId]
    );
    return;
  }

  await db.query(
    `
    UPDATE user_team_memberships
    SET ends_at = NOW()
    WHERE user_id = $1
      AND team_id = $2
      AND ends_at IS NULL
    `,
    [userId, teamId]
  );
}

async function refreshToken(account) {
  const loginRes = await request("POST", "/api/auth/login", {
    body: { email: account.email, password: PASSWORD }
  });
  assert.equal(loginRes.status, 200);
  account.token = loginRes.data.accessToken;
}

async function startServer() {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
}

async function stopServer() {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function assertFinanceAccess(account, expectedStatusByPath) {
  for (const [path, status] of expectedStatusByPath) {
    const res = await request("GET", path, { token: account.token });
    assert.equal(
      res.status,
      status,
      `Unexpected status for ${account.email} on ${path}. got=${res.status} expected=${status}`
    );
  }
}

async function main() {
  await startServer();

  const superAdmin = await registerAndLogin("rebac_fin_super");
  const financeMember = await registerAndLogin("rebac_fin_member");
  const financeNoTeam = await registerAndLogin("rebac_fin_noteam");

  await assignRole(superAdmin.userId, "SUPER_ADMIN");
  await assignRole(financeMember.userId, "FINANCE_ADMIN");
  await assignRole(financeNoTeam.userId, "FINANCE_ADMIN");

  await setFinanceMembership(financeMember.userId, true);
  await setFinanceMembership(financeNoTeam.userId, false);

  await refreshToken(superAdmin);
  await refreshToken(financeMember);
  await refreshToken(financeNoTeam);

  const financeProtectedPaths = [
    ["/admin/finance/overview", 200],
    ["/api/payments", 200],
    ["/api/payouts", 200]
  ];

  await assertFinanceAccess(superAdmin, financeProtectedPaths);
  await assertFinanceAccess(financeMember, financeProtectedPaths);

  await assertFinanceAccess(financeNoTeam, [
    ["/admin/finance/overview", 403],
    ["/api/payments", 403],
    ["/api/payouts", 403]
  ]);

  console.log("[REBAC FINANCE TEST] PASSED");
}

main()
  .catch((err) => {
    console.error("[REBAC FINANCE TEST] FAILED");
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer().catch(() => {});
    if (db.pool) {
      await db.pool.end();
    }
  });
