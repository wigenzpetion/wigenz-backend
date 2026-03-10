const http = require("http");
const assert = require("assert/strict");

require("dotenv").config();

const app = require("../src/app");
const db = require("../src/config/db");

const TEST_PASSWORD = "StrongPass#123";
const TEST_ROLES = [
  "SUPER_ADMIN",
  "TECH_ADMIN",
  "FINANCE_ADMIN",
  "SUPPORT_AGENT",
  "SUPPORT_ADMIN",
  "RISK_ADMIN",
  "OPERATIONS_ADMIN",
  "HR_ADMIN",
  "CLIENT"
];

const CASES = [
  {
    key: "financeOverview",
    method: "GET",
    path: "/admin/finance/overview",
    allow: ["SUPER_ADMIN", "FINANCE_ADMIN"]
  },
  {
    key: "operationsDrivers",
    method: "GET",
    path: "/admin/operations/drivers",
    allow: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "RISK_ADMIN"]
  },
  {
    key: "riskHighDrivers",
    method: "GET",
    path: "/admin/risk/high-drivers",
    allow: ["SUPER_ADMIN", "RISK_ADMIN"]
  },
  {
    key: "supportTickets",
    method: "GET",
    path: "/admin/support/tickets/list",
    allow: ["SUPER_ADMIN", "SUPPORT_ADMIN", "SUPPORT_AGENT"]
  },
  {
    key: "fraudDashboard",
    method: "GET",
    path: "/admin/fraud",
    allow: ["SUPER_ADMIN", "RISK_ADMIN"]
  },
  {
    key: "auditExport",
    method: "GET",
    path: "/admin/audit/export?start=2000-01-01&end=2100-01-01",
    allow: ["SUPER_ADMIN", "FINANCE_ADMIN"]
  }
];

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
          resolve({ status: res.statusCode, raw });
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

async function findEmailByRole(role) {
  const result = await db.query(
    `SELECT email
     FROM users
     WHERE role = $1
     ORDER BY id ASC
     LIMIT 1`,
    [role]
  );

  return result.rows[0]?.email || null;
}

async function login(email) {
  const res = await request("POST", "/api/auth/login", {
    body: {
      email,
      password: TEST_PASSWORD
    }
  });

  if (res.status !== 200) {
    return null;
  }

  try {
    const data = JSON.parse(res.raw || "{}");
    return data.accessToken || null;
  } catch {
    return null;
  }
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
  if (!server) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function pad(str, size) {
  const s = String(str);
  return s.length >= size ? s : `${s}${" ".repeat(size - s.length)}`;
}

async function main() {
  await startServer();

  const roleAccounts = {};
  for (const role of TEST_ROLES) {
    const email = await findEmailByRole(role);
    roleAccounts[role] = {
      email,
      token: email ? await login(email) : null
    };
  }

  console.log("RBAC smoke matrix (/admin)");
  console.log(`${pad("Case", 18)} ${pad("Role", 17)} ${pad("Expected", 9)} Status Result`);

  const failures = [];

  for (const testCase of CASES) {
    for (const role of TEST_ROLES) {
      const shouldAllow = testCase.allow.includes(role);
      const account = roleAccounts[role];
      const expected = shouldAllow ? "allow" : "deny";

      if (!account.email || !account.token) {
        const result = shouldAllow ? "FAIL" : "OK";
        console.log(
          `${pad(testCase.key, 18)} ${pad(role, 17)} ${pad(expected, 9)} ${pad("N/A", 6)} ${result} (no account/token)`
        );
        if (shouldAllow) {
          failures.push(`${testCase.key} ${role}: missing account/token`);
        }
        continue;
      }

      const res = await request(testCase.method, testCase.path, {
        token: account.token
      });

      const isAllowed = res.status !== 401 && res.status !== 403;
      const ok = shouldAllow ? isAllowed : res.status === 403;

      console.log(
        `${pad(testCase.key, 18)} ${pad(role, 17)} ${pad(expected, 9)} ${pad(res.status, 6)} ${ok ? "OK" : "FAIL"}`
      );

      if (!ok) {
        failures.push(
          `${testCase.key} ${role}: expected ${expected}, got status=${res.status}`
        );
      }
    }
  }

  console.log("");
  console.log(`Summary: ${failures.length ? "FAILED" : "PASSED"}`);
  if (failures.length) {
    for (const failure of failures) {
      console.log(` - ${failure}`);
    }
  }

  assert.equal(failures.length, 0, "RBAC matrix has failures");
}

main()
  .catch((err) => {
    console.error("[RBAC TEST] FAILED");
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer().catch(() => {});
    if (db.pool) {
      await db.pool.end();
    }
  });
