const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TARGET_DIRS = [
  path.join(ROOT, "src", "routes"),
  path.join(ROOT, "src", "controllers")
];

const SIGNALS = [
  { key: "assigned_to", regex: /\bassigned_to\b/i },
  { key: "manager_id", regex: /\bmanager_id\b/i },
  { key: "team_id", regex: /\bteam_id\b/i },
  { key: "tenant_id", regex: /\btenant_id\b/i },
  { key: "organization_id", regex: /\borganization_id\b/i },
  { key: "approver_id", regex: /\bapprover_id\b/i },
  { key: "reviewer_id", regex: /\breviewer_id\b/i },
  { key: "delegated_to", regex: /\bdelegated_to\b/i },
  { key: "owner_id", regex: /\bowner_id\b/i },
  { key: "team_membership_table", regex: /\buser_team_memberships\b/i },
  { key: "manager_links_table", regex: /\buser_manager_links\b/i },
  { key: "resource_assignments_table", regex: /\bresource_assignments\b/i },
  { key: "assign_route", regex: /\/:id\/assign\b/i },
  { key: "reassign_route", regex: /\/:id\/reassign\b/i }
];

const COVERED_PATH_PATTERNS = [
  /\/src\/routes\/support\//i,
  /\/src\/routes\/payment\//i,
  /\/src\/routes\/payout\//i,
  /\/src\/routes\/admin\/support\.controller\.js$/i,
  /\/src\/routes\/admin\/finance\.controller\.js$/i,
  /\/src\/routes\/admin\/admin\.routes\.js$/i
];

const COVERED_CODE_PATTERNS = [
  /\brequireTeamMembership\(/,
  /\bensureTeamAccess\(/,
  /\bresource_assignments\b/i,
  /\bhasActiveAssigneeRelation\(/,
  /\bsharesSupportTeam\(/,
  /\bhasActiveTeamMembership\(/
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function listJsFilesRecursively(startDir) {
  if (!fs.existsSync(startDir)) {
    return [];
  }

  const out = [];
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsFilesRecursively(full));
      continue;
    }
    if (entry.isFile() && full.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

function findFirstLine(content, regex) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (regex.test(lines[i])) {
      return i + 1;
    }
  }
  return null;
}

function isCoveredByPath(filePath) {
  const normalized = normalizePath(filePath);
  return COVERED_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isCoveredByCode(content) {
  return COVERED_CODE_PATTERNS.some((pattern) => pattern.test(content));
}

function run() {
  const strictEnv = String(
    process.env.REBAC_READINESS_STRICT ||
      (process.env.CI ? "true" : "false")
  ).toLowerCase();
  const strict = strictEnv === "true";

  const files = TARGET_DIRS.flatMap((dir) => listJsFilesRecursively(dir));
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const matchedSignals = SIGNALS.filter(({ regex }) => regex.test(content));
    if (!matchedSignals.length) {
      continue;
    }

    const covered = isCoveredByPath(filePath) || isCoveredByCode(content);
    if (covered) {
      continue;
    }

    const details = matchedSignals.map(({ key, regex }) => ({
      key,
      line: findFirstLine(content, regex)
    }));

    findings.push({
      filePath: normalizePath(path.relative(ROOT, filePath)),
      details
    });
  }

  if (!findings.length) {
    console.log("[ReBAC Readiness] OK - no uncovered relational patterns found.");
    return 0;
  }

  console.log("[ReBAC Readiness] Potential uncovered relational domains:");
  for (const finding of findings) {
    const signals = finding.details
      .map((d) => `${d.key}${d.line ? `@L${d.line}` : ""}`)
      .join(", ");
    console.log(` - ${finding.filePath}: ${signals}`);
  }

  const hint = strict
    ? "failing build (strict mode)"
    : "warning only (non-strict mode)";
  console.log(`[ReBAC Readiness] ${hint}`);

  return strict ? 1 : 0;
}

process.exitCode = run();
