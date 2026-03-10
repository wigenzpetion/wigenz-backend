let pool = null;

try {
  const { Pool } = require("pg");

  pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "wigenz_db",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  pool.connect()
    .then((client) => {
      console.log("Database connected");
      client.release();
    })
    .catch((err) => {
      console.warn("Database unreachable, running in degraded mode:", err.message);
    });
} catch (err) {
  console.warn("pg module not installed, running in degraded mode:", err.message);
}

module.exports = {
  query: async (text, params) => {
    if (!pool) {
      throw new Error("Database is not configured");
    }

    return pool.query(text, params);
  },
  pool
};