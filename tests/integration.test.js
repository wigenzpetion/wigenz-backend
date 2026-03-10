const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

require("dotenv").config();

const app = require("../src/app");
const db = require("../src/config/db");

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
            // keep raw response
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
  assert.ok(registerRes.data.accessToken);

  const loginRes = await request("POST", "/api/auth/login", {
    body: { email, password }
  });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.data.accessToken);

  return { email, token: loginRes.data.accessToken, user: loginRes.data.user };
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  if (db.pool) {
    await db.pool.end();
  }
});

test("GET /health returns API and DB status", async () => {
  const res = await request("GET", "/health");
  assert.equal(res.status, 200);
  assert.equal(res.data.status, "ok");
  assert.equal(res.data.database, "up");
});

test("Auth register/login works and register enforces CLIENT role", async () => {
  const { token } = await createClientAndToken();
  assert.ok(token);
});

test("Support flow: create ticket, list tickets, reply, detail", async () => {
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
});

test("Order flow: create client order then cancel", async () => {
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
});
