/**
 * Exécute les migrations SQL du module support.
 * À lancer depuis la racine du projet : node wigenz-backen/scripts/run-support-migrations.js
 */
const path = require("path");
const fs = require("fs");

// Charger les variables d'environnement du backend
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../src/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "config", "migrations");
const FILES = [
  "20260306_support_tickets.sql",
  "20260306_support_priority_category.sql",
  "20260306_support_attachments.sql"
];

async function run() {
  console.log("Exécution des migrations support...\n");

  for (const file of FILES) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn("Fichier non trouvé:", filePath);
      continue;
    }
    const sql = fs.readFileSync(filePath, "utf8");
    const name = path.basename(file);
    try {
      await db.query(sql);
      console.log("OK:", name);
    } catch (err) {
      console.error("Erreur lors de", name, ":", err.message);
      process.exit(1);
    }
  }

  console.log("\nMigrations support terminées.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
