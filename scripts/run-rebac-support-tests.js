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
            // Keep raw string.
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

async function ensureSupportMembership(userId, roleCode) {
  const teamRes = await db.query(
    "SELECT id FROM teams WHERE team_code = 'SUPPORT' LIMIT 1"
  );
  assert.ok(teamRes.rows[0], "Missing SUPPORT team");
  const teamId = teamRes.rows[0].id;

  const membershipRole = roleCode === "SUPPORT_ADMIN" ? "LEAD" : "AGENT";
  await db.query(
    `
    INSERT INTO user_team_memberships (user_id, team_id, membership_role, is_primary)
    SELECT $1, $2, $3, TRUE
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_team_memberships
      WHERE user_id = $1
        AND team_id = $2
        AND ends_at IS NULL
    )
    `,
    [userId, teamId, membershipRole]
  );
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

async function main() {
  await startServer();

  const client = await registerAndLogin("rebac_client");
  const supportAdmin = await registerAndLogin("rebac_support_admin");
  const supportAgent = await registerAndLogin("rebac_support_agent");
  const supportAgent2 = await registerAndLogin("rebac_support_agent2");

  await assignRole(supportAdmin.userId, "SUPPORT_ADMIN");
  await assignRole(supportAgent.userId, "SUPPORT_AGENT");
  await assignRole(supportAgent2.userId, "SUPPORT_AGENT");

  await ensureSupportMembership(supportAdmin.userId, "SUPPORT_ADMIN");
  await ensureSupportMembership(supportAgent.userId, "SUPPORT_AGENT");
  await ensureSupportMembership(supportAgent2.userId, "SUPPORT_AGENT");

  // Refresh tokens with latest role claims.
  const supportAdminLogin = await request("POST", "/api/auth/login", {
    body: { email: supportAdmin.email, password: PASSWORD }
  });
  assert.equal(supportAdminLogin.status, 200);
  supportAdmin.token = supportAdminLogin.data.accessToken;

  const supportAgentLogin = await request("POST", "/api/auth/login", {
    body: { email: supportAgent.email, password: PASSWORD }
  });
  assert.equal(supportAgentLogin.status, 200);
  supportAgent.token = supportAgentLogin.data.accessToken;

  const supportAgent2Login = await request("POST", "/api/auth/login", {
    body: { email: supportAgent2.email, password: PASSWORD }
  });
  assert.equal(supportAgent2Login.status, 200);
  supportAgent2.token = supportAgent2Login.data.accessToken;

  const ticketRes = await request("POST", "/api/support", {
    token: client.token,
    body: {
      subject: "ReBAC support access test",
      message: "Please help",
      priority: "MEDIUM",
      category: "LIVRAISON"
    }
  });
  assert.equal(ticketRes.status, 201);
  const ticketId = ticketRes.data.id;

  // Unassigned ticket: support agent should be denied.
  const deniedBeforeAssign = await request(
    "GET",
    `/admin/support/ticket/${ticketId}`,
    { token: supportAgent.token }
  );
  assert.equal(deniedBeforeAssign.status, 403);

  // Support admin can assign.
  const assignRes = await request(
    "PATCH",
    `/admin/support/ticket/${ticketId}/assign`,
    {
      token: supportAdmin.token,
      body: { assigned_to: supportAgent.userId }
    }
  );
  assert.equal(assignRes.status, 200);
  assert.equal(Number(assignRes.data.assigned_to), supportAgent.userId);

  // Assigned support agent can access and reply.
  const assignedAccess = await request(
    "GET",
    `/admin/support/ticket/${ticketId}`,
    { token: supportAgent.token }
  );
  assert.equal(assignedAccess.status, 200);

  const replyRes = await request(
    "POST",
    `/admin/support/ticket/${ticketId}/replies`,
    {
      token: supportAgent.token,
      body: { message: "Taking ownership of this ticket." }
    }
  );
  assert.equal(replyRes.status, 201);

  // Another support agent in same team stays denied (strict assignee policy for agents).
  const deniedOtherAgent = await request(
    "GET",
    `/admin/support/ticket/${ticketId}`,
    { token: supportAgent2.token }
  );
  assert.equal(deniedOtherAgent.status, 403);

  // Support admin keeps visibility by team/supervision relation.
  const adminAccess = await request(
    "GET",
    `/admin/support/ticket/${ticketId}`,
    { token: supportAdmin.token }
  );
  assert.equal(adminAccess.status, 200);

  // Client owner still sees own ticket.
  const clientAccess = await request("GET", `/api/support/${ticketId}`, {
    token: client.token
  });
  assert.equal(clientAccess.status, 200);

  console.log("[REBAC SUPPORT TEST] PASSED");
}

main()
  .catch((err) => {
    console.error("[REBAC SUPPORT TEST] FAILED");
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer().catch(() => {});
    if (db.pool) {
      await db.pool.end();
    }
  });
