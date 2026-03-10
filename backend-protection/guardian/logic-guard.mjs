import chokidar from "chokidar";
import fs from "fs";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBackendSrcDir() {
  const candidates = [
    path.resolve(__dirname, "../../src"),
    path.resolve(__dirname, "../src"),
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

console.log(chalk.green("WIGENZ LOGIC GUARD ACTIVE"));
console.log(chalk.gray(`Watching: ${srcDir}`));

function block(message, risk, solution) {
  console.log("\n==============================");
  console.log("LOGIC BREAK DETECTED");
  console.log("==============================");

  console.log("\nProblem:");
  console.log(message);

  console.log("\nRisk:");
  console.log(risk);

  console.log("\nSolution:");
  console.log(solution);

  console.log("\nAction:");
  console.log("Do NOT commit this change until fixed.");

  console.log("==============================\n");
}

function checkWalletLogic(code) {
  if (code.includes("wallet.balance =")) {
    block(
      "Direct wallet balance modification detected",
      "Wallet balance may become inconsistent with ledger transactions.",
      "Wallet balance must be derived from Ledger transactions only."
    );
  }
}

function checkPaymentLogic(code) {
  if (code.includes("createPayment") && !code.includes("idempotency")) {
    block(
      "Payment created without idempotency protection",
      "User may be charged twice if request retries.",
      "Use idempotency key or unique payment reference."
    );
  }
}

function checkLedgerLogic(code) {
  const lowered = code.toLowerCase();
  if (lowered.includes("insert into ledger") && !lowered.includes("transaction")) {
    block(
      "Ledger write outside DB transaction",
      "Financial records may become inconsistent.",
      "Ledger operations must run inside database transaction."
    );
  }
}

function checkDispatchLogic(code) {
  if (code.includes("distance") && !code.includes("eta")) {
    block(
      "Dispatch algorithm incomplete",
      "Driver selection may be inefficient.",
      "Include ETA and driver availability in dispatch decision."
    );
  }
}

watcher.on("change", (file) => {
  if (!file.endsWith(".js")) return;

  console.log(chalk.blue(`\nFile changed: ${file}`));

  const code = fs.readFileSync(file, "utf8");

  checkWalletLogic(code);
  checkPaymentLogic(code);
  checkLedgerLogic(code);
  checkDispatchLogic(code);
});
