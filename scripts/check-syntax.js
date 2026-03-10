const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const TARGETS = [
  path.join(ROOT, "server.js"),
  path.join(ROOT, "src"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "backend-protection")
];

function listJsFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return [];

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return (targetPath.endsWith(".js") || targetPath.endsWith(".mjs")) ? [targetPath] : [];
  }

  const out = [];
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsFiles(full));
    } else if (entry.isFile() && (full.endsWith(".js") || full.endsWith(".mjs"))) {
      out.push(full);
    }
  }
  return out;
}

function checkFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");

  if (filePath.endsWith(".mjs")) {
    if (typeof vm.SourceTextModule === "function") {
      // Parse ESM source without executing it.
      new vm.SourceTextModule(source, { identifier: filePath });
    }
    return;
  }

  // Emulate CommonJS wrapper so top-level `return` in legacy files is parsed consistently.
  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${source}\n});`;
  new vm.Script(wrapped, { filename: filePath });
}

function run() {
  const files = TARGETS.flatMap((p) => listJsFiles(p));
  let checked = 0;

  for (const file of files) {
    checkFile(file);
    checked += 1;
  }

  console.log(`Syntax check OK (${checked} files).`);
}

try {
  run();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
