/**
 * Execute all SQL migrations in config/migrations in lexical order.
 * Run from backend root: node scripts/run-migrations.js
 */
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../src/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "config", "migrations");

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`);
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function run() {
  const files = listSqlFiles(MIGRATIONS_DIR);
  if (!files.length) {
    console.log("No migration files found.");
    return;
  }

  console.log(`Running ${files.length} migrations...\n`);

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, "utf8");

    try {
      await db.query(sql);
      console.log(`OK: ${file}`);
    } catch (err) {
      console.error(`FAILED: ${file}`);
      console.error(err.message);
      throw err;
    }
  }

  console.log("\nAll migrations completed.");
}

run()
  .then(async () => {
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  })
  .catch(async () => {
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(1);
  });
