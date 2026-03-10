import chokidar from "chokidar";
import fs from "fs";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBackendSrcDir() {
  const candidates = [
    path.resolve(__dirname, "../src"),
    path.resolve(__dirname, "./src"),
    path.resolve(process.cwd(), "src")
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  return candidates[0];
}

const srcDir = resolveBackendSrcDir();

const watcher = chokidar.watch(srcDir, {
  ignored: /node_modules/,
  persistent: true
});

console.log(chalk.green("AI DEV GUARDIAN - ARCHITECTURE MODE ACTIVE"));
console.log(chalk.gray(`Watching: ${srcDir}`));

const db = new Client({
  connectionString: process.env.DATABASE_URL
});

db.connect().catch(() => {
  console.log("PostgreSQL monitoring unavailable");
});

function alertIssue(problem, risk, solution, prompt) {
  console.log("\n==============================");
  console.log("AI DEV GUARDIAN ALERT");
  console.log("==============================");

  console.log("\nProblem Detected:");
  console.log(problem);

  console.log("\nRisk:");
  console.log(risk);

  console.log("\nProposed Solution:");
  console.log(solution);

  console.log("\nAsk Cursor + Codex:");
  console.log(prompt);

  console.log("\n==============================\n");
}

async function checkLint() {
  try {
    await execa("npm", ["run", "lint"]);
  } catch {
    alertIssue(
      "Lint errors detected",
      "Code quality issue may hide bugs or security problems.",
      "Fix lint errors before merging code.",
      "Explain lint errors and propose corrected code."
    );
  }
}

async function checkTests() {
  try {
    await execa("npm", ["run", "test"]);
  } catch {
    alertIssue(
      "Test failure detected",
      "A feature may be broken or logic incorrect.",
      "Identify failing logic and correct implementation.",
      "Explain failing tests and propose a fix."
    );
  }
}

async function detectSlowQueries() {
  try {
    const result = await db.query(`
      SELECT query, mean_exec_time
      FROM pg_stat_statements
      ORDER BY mean_exec_time DESC
      LIMIT 5
    `);

    result.rows.forEach((row) => {
      if (row.mean_exec_time > 200) {
        alertIssue(
          "Slow SQL query detected",
          "Slow queries may cause API latency or system overload.",
          "Add indexes or optimize the query.",
          `Analyze SQL query and suggest optimization:\n${row.query}`
        );
      }
    });
  } catch {}
}

function detectWalletLedgerIssue(code) {
  if (code.includes("wallet.balance") && code.includes("=")) {
    alertIssue(
      "Direct wallet balance modification detected",
      "Wallet balance may diverge from Ledger transactions.",
      "Balance must be updated via Ledger transactions within a DB transaction.",
      `Analyze WalletService and LedgerService.\nDetect if wallet balance bypasses ledger.\nPropose safe transactional pattern.`
    );
  }
}

function detectDoublePayment(code) {
  if (code.includes("createPayment") && !code.includes("idempotency")) {
    alertIssue(
      "Possible double payment risk",
      "Retrying payment request may charge the user twice.",
      "Use idempotency keys and DB transaction locks.",
      `Analyze PaymentService and WalletService.\nCheck idempotency and duplicate payment risk.`
    );
  }
}

function detectDispatchIssue(code) {
  if (code.includes("distance") && !code.includes("eta")) {
    alertIssue(
      "Dispatch algorithm incomplete",
      "Driver selection may be inefficient causing delays.",
      "Dispatch must consider ETA, availability, and priority.",
      `Analyze dispatch.service.js.\nVerify driver selection algorithm and improve dispatch logic.`
    );
  }
}

function detectEventRaceCondition(code) {
  if (code.includes("eventBus.emit") && !code.includes("await")) {
    alertIssue(
      "Potential race condition in event processing",
      "Events may execute out of order causing inconsistent state.",
      "Use async queue or transactional event handling.",
      "Analyze eventBus usage and detect race conditions."
    );
  }
}

async function runArchitectureAnalysis(file) {
  if (!file.endsWith(".js")) return;

  console.log(chalk.blue(`\nFile modified: ${file}`));

  const code = fs.readFileSync(file, "utf8");

  await checkLint();
  await checkTests();

  detectWalletLedgerIssue(code);
  detectDoublePayment(code);
  detectDispatchIssue(code);
  detectEventRaceCondition(code);

  await detectSlowQueries();
}

watcher.on("change", (file) => {
  runArchitectureAnalysis(file);
});
