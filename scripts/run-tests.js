const http = require("http");
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const app = require("../src/app");
const db = require("../src/config/db");
const WalletService = require("../src/routes/wallet/wallet.service");
const LedgerService = require("../src/routes/fintech/ledger.service");

let server;
let port;

function log(message) {
  console.log(`[TEST] ${message}`);
}

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
            // keep raw
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function createClientAndToken() {
  const email = `client_${Date.now()}_${Math.floor(Math.random() * 10000)}@wigenz.test`;
  const password = "StrongPass#123";

  const registerRes = await request("POST", "/api/auth/register", {
    body: {
      name: "Test Client",
      email,
      password,
      role: "ADMIN"
    }
  });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.data.user.role, "CLIENT");

  const loginRes = await request("POST", "/api/auth/login", {
    body: { email, password }
  });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.data.accessToken);

  return { token: loginRes.data.accessToken, userId: loginRes.data.user.id };
}

async function testHealth() {
  log("Health endpoint");
  const res = await request("GET", "/health");
  assert.equal(res.status, 200);
  assert.equal(res.data.status, "ok");
  assert.equal(res.data.database, "up");
}

async function testAuth() {
  log("Auth register/login");
  const result = await createClientAndToken();
  assert.ok(result.token);
}

async function testSupportFlow() {
  log("Support flow");
  const { token } = await createClientAndToken();

  const createRes = await request("POST", "/api/support", {
    token,
    body: {
      subject: "Incident livraison",
      message: "Le colis est en retard",
      priority: "MEDIUM",
      category: "LIVRAISON"
    }
  });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.data.id);
  const ticketId = createRes.data.id;

  const listRes = await request("GET", "/api/support", { token });
  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.data));
  assert.ok(listRes.data.some((t) => t.id === ticketId));

  const replyRes = await request("POST", `/api/support/${ticketId}/replies`, {
    token,
    body: { message: "Merci pour le suivi." }
  });
  assert.equal(replyRes.status, 201);

  const detailRes = await request("GET", `/api/support/${ticketId}`, { token });
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.id, ticketId);
  assert.ok(Array.isArray(detailRes.data.replies));
  assert.ok(detailRes.data.replies.length >= 1);
}

async function testOrderFlow() {
  log("Order create/cancel flow");
  const { token } = await createClientAndToken();

  const orderRes = await request("POST", "/api/client-orders", {
    token,
    body: {
      pickup_address: "Avenue 1",
      pickup_lat: 48.8566,
      pickup_lng: 2.3522,
      delivery_address: "Avenue 2",
      delivery_lat: 48.8584,
      delivery_lng: 2.2945
    }
  });

  assert.equal(orderRes.status, 201);
  assert.ok(orderRes.data.id);

  const cancelRes = await request("PATCH", `/api/client-orders/${orderRes.data.id}/cancel`, {
    token
  });
  assert.equal(cancelRes.status, 200);
  assert.match(String(cancelRes.data.message || ""), /cancel/i);
}

async function createOrderForClient(token) {
  const orderRes = await request("POST", "/api/client-orders", {
    token,
    body: {
      pickup_address: "Avenue 1",
      pickup_lat: 48.8566,
      pickup_lng: 2.3522,
      delivery_address: "Avenue 2",
      delivery_lat: 48.8584,
      delivery_lng: 2.2945
    }
  });
  assert.equal(orderRes.status, 201);
  return orderRes.data;
}

async function testWalletFlow() {
  log("Wallet debit/credit/insufficient");

  const { token, userId } = await createClientAndToken();

  await db.query(
    `UPDATE wallets
     SET available_balance = 100, locked_balance = 0, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  const debitOk = await request("POST", "/wallet/debit", {
    token,
    body: { amount: 30 }
  });
  assert.equal(debitOk.status, 200);

  let wallet = await db.query(
    "SELECT available_balance FROM wallets WHERE user_id = $1",
    [userId]
  );
  assert.equal(Number(wallet.rows[0].available_balance), 70);

  await WalletService.credit(userId, 20);
  wallet = await db.query(
    "SELECT available_balance FROM wallets WHERE user_id = $1",
    [userId]
  );
  assert.equal(Number(wallet.rows[0].available_balance), 90);

  const beforeFail = Number(wallet.rows[0].available_balance);
  const debitFail = await request("POST", "/wallet/debit", {
    token,
    body: { amount: 9999 }
  });
  assert.equal(debitFail.status, 500);

  wallet = await db.query(
    "SELECT available_balance FROM wallets WHERE user_id = $1",
    [userId]
  );
  assert.equal(Number(wallet.rows[0].available_balance), beforeFail);
}

async function testPaymentIdempotency() {
  log("Payment idempotency and transaction registration");

  const { token, userId } = await createClientAndToken();
  const order = await createOrderForClient(token);
  const idemKey = `idem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const body = {
    order_id: order.id,
    amount: 42.5,
    currency: "USD",
    payment_method: "CARD",
    transaction_id: `tx-${Date.now()}`,
    idempotency_key: idemKey
  };

  const first = await request("POST", "/api/payments", { token, body });
  assert.equal(first.status, 201);
  assert.ok(first.data.id);

  const second = await request("POST", "/api/payments", { token, body });
  assert.equal(second.status, 201);
  assert.equal(second.data.id, first.data.id);

  const paymentCount = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM payments
     WHERE user_id = $1
       AND idempotency_key = $2`,
    [userId, idemKey]
  );
  assert.equal(paymentCount.rows[0].count, 1);

  const invoiceCount = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM invoices
     WHERE user_id = $1
       AND related_id = $2
       AND type = 'DELIVERY_PAYMENT'`,
    [userId, first.data.id]
  );
  assert.equal(invoiceCount.rows[0].count, 1);
}

async function testLedgerTransactionRollback() {
  log("Ledger transaction rollback");

  const before = await db.query(
    "SELECT COUNT(*)::int AS count FROM fintech_ledger_entries"
  );

  let failed = false;
  try {
    await LedgerService.createEntry({
      referenceId: 999999,
      referenceType: "TEST_LEDGER",
      debitAccountId: 999999, // invalid FK -> should rollback
      creditAccountId: 1,
      amount: 10,
      metadata: { reason: "rollback-test" }
    });
  } catch (_err) {
    failed = true;
  }
  assert.equal(failed, true);

  const after = await db.query(
    "SELECT COUNT(*)::int AS count FROM fintech_ledger_entries"
  );
  assert.equal(after.rows[0].count, before.rows[0].count);
}

function listFilesRecursively(dirPath) {
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursively(full));
    } else if (entry.isFile() && full.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

async function testNoDirectWalletBalanceMutation() {
  log("No direct wallet.balance assignment in backend code");

  const srcDir = path.join(__dirname, "..", "src");
  const files = listFilesRecursively(srcDir);
  const offenders = [];

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    if (/wallet\.balance\s*=/.test(code)) {
      offenders.push(file);
    }
  }

  assert.equal(offenders.length, 0);
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
  try {
    await testHealth();
    await testAuth();
    await testWalletFlow();
    await testPaymentIdempotency();
    await testLedgerTransactionRollback();
    await testNoDirectWalletBalanceMutation();
    await testSupportFlow();
    await testOrderFlow();
    log("All integration tests passed");
  } finally {
    await stopServer();
    if (db.pool) {
      await db.pool.end();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[TEST] FAILED");
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
