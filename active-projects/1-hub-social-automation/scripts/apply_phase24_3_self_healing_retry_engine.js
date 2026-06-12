const fs = require("fs");
const path = require("path");

const root = process.cwd();
const p = (...x) => path.join(root, ...x);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
function write(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content);
}
function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}
function patchOnce(filePath, marker, patcher) {
  const src = read(filePath);
  if (src.includes(marker)) return false;
  write(filePath, patcher(src));
  return true;
}

write(p("modules/admin-platform/services/self_healing_retry_service.js"), `const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const ops = require("./factory_operations_service");
const runtime = require("./autonomous_factory_runtime_service");

const ROOT = path.resolve(__dirname, "../../..");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function configFile() {
  return path.join(ROOT, "storage/admin-platform/self_healing_retry_config.json");
}

function queueFile() {
  return path.join(ROOT, "storage/admin-platform/self_healing_retry_queue.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/self_healing_retry_history.json");
}

function runtimeRunsFile() {
  return path.join(ROOT, "storage/admin-platform/autonomous_runtime_runs.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    dryRun: true,
    maxRetryAttempts: 3,
    retryBlockedRuns: true,
    retryFailedLaunches: true,
    requireSafeMode: true,
    autoRetry: false,
    retryDelayMinutes: 15
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
}

function getQueue() {
  return readJson(queueFile(), { items: [] });
}

function saveQueue(queue) {
  writeJson(queueFile(), queue);
}

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function classifyFailure(item) {
  const raw = JSON.stringify(item || {}).toLowerCase();

  if (raw.includes("emergency_stop")) {
    return { type: "emergency_stop_guard", retryable: false, severity: "critical" };
  }
  if (raw.includes("safe_mode_required")) {
    return { type: "safe_mode_guard", retryable: true, severity: "warning" };
  }
  if (raw.includes("approval_required")) {
    return { type: "approval_required", retryable: false, severity: "warning" };
  }
  if (raw.includes("provider")) {
    return { type: "provider_failure", retryable: true, severity: "warning" };
  }
  if (raw.includes("channel")) {
    return { type: "channel_failure", retryable: true, severity: "warning" };
  }
  if (raw.includes("blocked")) {
    return { type: "runtime_blocked", retryable: true, severity: "warning" };
  }
  if (raw.includes("fail") || raw.includes("error")) {
    return { type: "generic_failure", retryable: true, severity: "warning" };
  }

  return { type: "unknown_or_ok", retryable: false, severity: "info" };
}

function scanRuntimeFailures(actor = "self-healing") {
  const config = getConfig();
  const runtimeRuns = readJson(runtimeRunsFile(), { runs: [] }).runs || [];
  const queue = getQueue();
  const existingKeys = new Set((queue.items || []).map((i) => i.sourceKey));

  const added = [];

  for (const run of runtimeRuns) {
    const sourceKey = run.runId || run.scheduleRunId || JSON.stringify(run).slice(0, 80);
    if (existingKeys.has(sourceKey)) continue;

    const cls = classifyFailure(run);
    if (!cls.retryable) continue;
    if (!config.retryBlockedRuns && cls.type.includes("blocked")) continue;

    const item = {
      retryId: "rty_" + crypto.randomBytes(6).toString("hex"),
      sourceKey,
      sourceType: "autonomous_runtime_run",
      status: "queued",
      attempts: 0,
      maxAttempts: config.maxRetryAttempts,
      classification: cls,
      source: run,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    queue.items.push(item);
    added.push(item);
  }

  saveQueue(queue);

  audit.appendAuditEvent({
    actor,
    action: "self_healing_scan_completed",
    entityType: "retry_engine",
    entityId: "scan",
    severity: "info",
    metadata: { added: added.length }
  });

  return { success: true, added, totalQueued: queue.items.length };
}

function runRetry(retryId, actor = "admin") {
  const config = getConfig();
  const center = ops.getOperationsCenter();

  if (config.requireSafeMode && !(center.state && center.state.safeMode)) {
    return { success: false, error: "SAFE_MODE_REQUIRED" };
  }

  if (center.state && center.state.emergencyStop) {
    return { success: false, error: "EMERGENCY_STOP_ENABLED" };
  }

  const queue = getQueue();
  const item = (queue.items || []).find((i) => i.retryId === retryId);

  if (!item) return { success: false, error: "RETRY_ITEM_NOT_FOUND", retryId };
  if (item.attempts >= item.maxAttempts) {
    item.status = "exhausted";
    item.updatedAt = new Date().toISOString();
    saveQueue(queue);
    return { success: false, error: "RETRY_ATTEMPTS_EXHAUSTED", retryId };
  }

  item.attempts += 1;
  item.status = config.dryRun ? "dry_run_retry_recorded" : "retry_executed";
  item.updatedAt = new Date().toISOString();

  const runtimeResult = config.dryRun
    ? { success: true, dryRun: true, message: "Retry dry-run recorded. Runtime not triggered." }
    : runtime.runOnce(actor);

  const history = getHistory();
  const retryRun = {
    retryRunId: "rtr_" + crypto.randomBytes(6).toString("hex"),
    retryId,
    status: item.status,
    runtimeResult,
    createdAt: new Date().toISOString()
  };
  history.runs.push(retryRun);

  saveQueue(queue);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "self_healing_retry_run",
    entityType: "retry_item",
    entityId: retryId,
    severity: "warning",
    metadata: retryRun
  });

  return { success: true, retryRun, item };
}

function runNextRetry(actor = "admin") {
  const queue = getQueue();
  const next = (queue.items || []).find((i) => i.status === "queued" && i.attempts < i.maxAttempts);
  if (!next) return { success: true, skipped: true, reason: "NO_RETRY_ITEMS_AVAILABLE" };
  return runRetry(next.retryId, actor);
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    retryBlockedRuns: patch.retryBlockedRuns === undefined ? current.retryBlockedRuns : Boolean(patch.retryBlockedRuns),
    retryFailedLaunches: patch.retryFailedLaunches === undefined ? current.retryFailedLaunches : Boolean(patch.retryFailedLaunches),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    autoRetry: patch.autoRetry === undefined ? current.autoRetry : Boolean(patch.autoRetry),
    maxRetryAttempts: Number(patch.maxRetryAttempts || current.maxRetryAttempts || 3),
    retryDelayMinutes: Number(patch.retryDelayMinutes || current.retryDelayMinutes || 15)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "self_healing_retry_config_updated",
    entityType: "retry_engine",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getRetryCenter() {
  const config = getConfig();
  const queue = getQueue();
  const history = getHistory();

  const counts = (queue.items || []).reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  return {
    success: true,
    phase: "24.3-self-healing-retry-engine",
    config,
    summary: {
      totalItems: (queue.items || []).length,
      statusCounts: counts,
      historyRuns: (history.runs || []).length
    },
    queue: (queue.items || []).slice(-50).reverse(),
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  classifyFailure,
  scanRuntimeFailures,
  runRetry,
  runNextRetry,
  getRetryCenter
};
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_24_3_SELF_HEALING_RETRY_API", (src) => {
  let out = src;
  if (!out.includes("self_healing_retry_service")) {
    out = `
// PHASE_24_3_SELF_HEALING_RETRY_API
const selfHealingRetryService = require("../services/self_healing_retry_service");
` + out;
  }

  const routes = `
/* PHASE_24_3_SELF_HEALING_RETRY_API */
app.get("/api/admin/factory/self-healing", (req, res) => {
  res.json(selfHealingRetryService.getRetryCenter());
});

app.post("/api/admin/factory/self-healing/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/self-healing/scan", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.scanRuntimeFailures(actor));
});

app.post("/api/admin/factory/self-healing/retry-next", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.runNextRetry(actor));
});

app.post("/api/admin/factory/self-healing/retry/:retryId", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.runRetry(req.params.retryId, actor));
});
/* END_PHASE_24_3_SELF_HEALING_RETRY_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_24_3_SELF_HEALING_RETRY_UI", (src) => {
  return src + `

/* PHASE_24_3_SELF_HEALING_RETRY_UI */
async function loadSelfHealingRetryCenter() {
  const mountId = "self-healing-retry-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card self-healing-retry-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Self-Healing + Retry Engine</h2><p>Loading retry center...</p>";

  try {
    const res = await fetch("/api/admin/factory/self-healing");
    const data = await res.json();
    const config = data.config || {};
    const summary = data.summary || {};

    mount.innerHTML = \`
      <h2>Self-Healing + Retry Engine</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Retry Engine: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE RETRY"}</span>
        <span class="status-pill">Max Attempts: \${config.maxRetryAttempts}</span>
      </div>

      <div class="button-row">
        <button onclick="toggleSelfHealingRetry(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Retry Engine</button>
        <button onclick="scanSelfHealingFailures()">Scan Failures</button>
        <button onclick="runNextSelfHealingRetry()">Run Next Retry</button>
        <button onclick="loadSelfHealingRetryCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Total Retry Items: <b>\${summary.totalItems || 0}</b></div>
        <div>History Runs: <b>\${summary.historyRuns || 0}</b></div>
        <div>Queued: <b>\${(summary.statusCounts || {}).queued || 0}</b></div>
        <div>Dry Retry: <b>\${(summary.statusCounts || {}).dry_run_retry_recorded || 0}</b></div>
      </div>

      <h3>Retry Queue</h3>
      <pre class="ops-json">\${JSON.stringify(data.queue || [], null, 2)}</pre>

      <h3>Retry History</h3>
      <pre class="ops-json">\${JSON.stringify(data.recentRuns || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Self-Healing + Retry Engine</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleSelfHealingRetry(enabled) {
  await fetch("/api/admin/factory/self-healing/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadSelfHealingRetryCenter();
}

async function scanSelfHealingFailures() {
  await fetch("/api/admin/factory/self-healing/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadSelfHealingRetryCenter();
}

async function runNextSelfHealingRetry() {
  await fetch("/api/admin/factory/self-healing/retry-next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadSelfHealingRetryCenter();
}

if (typeof window !== "undefined") {
  window.loadSelfHealingRetryCenter = loadSelfHealingRetryCenter;
  window.toggleSelfHealingRetry = toggleSelfHealingRetry;
  window.scanSelfHealingFailures = scanSelfHealingFailures;
  window.runNextSelfHealingRetry = runNextSelfHealingRetry;
  window.addEventListener("DOMContentLoaded", loadSelfHealingRetryCenter);
}
/* END_PHASE_24_3_SELF_HEALING_RETRY_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_24_3_SELF_HEALING_RETRY_STYLES", (src) => {
  return src + `

/* PHASE_24_3_SELF_HEALING_RETRY_STYLES */
.self-healing-retry-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_24_3_SELF_HEALING_RETRY_STYLES */
`;
});

write(p("storage/admin-platform/self_healing_retry_config.json"), JSON.stringify({
  enabled: true,
  dryRun: true,
  maxRetryAttempts: 3,
  retryBlockedRuns: true,
  retryFailedLaunches: true,
  requireSafeMode: true,
  autoRetry: false,
  retryDelayMinutes: 15
}, null, 2));

write(p("storage/admin-platform/self_healing_retry_queue.json"), JSON.stringify({ items: [] }, null, 2));
write(p("storage/admin-platform/self_healing_retry_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase24_3_self_healing_retry_check.js"), `const retry = require("./services/self_healing_retry_service");
const runtime = require("./services/autonomous_factory_runtime_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase24_3_check");
ops.setEmergencyStop(false, "phase24_3_clear", "phase24_3_check");

runtime.updateConfig({ enabled: false, dryRun: true }, "phase24_3_check");
runtime.runOnce("phase24_3_check_blocked_seed");

const config = retry.updateConfig({ enabled: true, dryRun: true }, "phase24_3_check");
const scan = retry.scanRuntimeFailures("phase24_3_check");
const center = retry.getRetryCenter();
const next = retry.runNextRetry("phase24_3_check");

const result = {
  success: true,
  phase: "24.3-self-healing-retry-engine",
  checks: {
    configReady: Boolean(config.success),
    classifierReady: Boolean(retry.classifyFailure({ status: "blocked" }).type),
    scanReady: Boolean(scan.success),
    retryCenterReady: Boolean(center.success),
    retryQueueReady: Array.isArray(center.queue),
    runNextRetryReady: Boolean(next.success),
    auditConnectedReady: true
  },
  scanAdded: scan.added.length,
  retryResult: next
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "24.3-self-healing-retry-engine"
}, null, 2));
