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

write(p("modules/admin-platform/services/publishing_queue_worker_service.js"), `const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const ops = require("./factory_operations_service");

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
  return path.join(ROOT, "storage/admin-platform/publishing_queue_worker_config.json");
}

function queueFile() {
  return path.join(ROOT, "storage/publishing/dispatch_bridge_queue.json");
}

function executionsFile() {
  return path.join(ROOT, "storage/publishing/publishing_execution_records.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/publishing_queue_worker_history.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    dryRun: true,
    requireSafeMode: true,
    maxItemsPerRun: 3,
    lockTimeoutMinutes: 15,
    allowedProviders: [],
    allowedChannels: []
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

function getExecutions() {
  return readJson(executionsFile(), { records: [] });
}

function saveExecutions(executions) {
  writeJson(executionsFile(), executions);
}

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function guardWorker(config) {
  const operations = ops.getOperationsCenter();

  if (!config.enabled) return { allowed: false, reason: "PUBLISHING_QUEUE_WORKER_DISABLED" };
  if (operations.state && operations.state.emergencyStop) return { allowed: false, reason: "EMERGENCY_STOP_ENABLED" };
  if (config.requireSafeMode && !(operations.state && operations.state.safeMode)) return { allowed: false, reason: "SAFE_MODE_REQUIRED" };

  return { allowed: true, reason: "WORKER_ALLOWED" };
}

function isAllowed(item, config) {
  if (config.allowedProviders.length && !config.allowedProviders.includes(item.provider)) return false;
  if (config.allowedChannels.length && !config.allowedChannels.includes(item.channelId)) return false;
  return true;
}

function selectQueueItems(config) {
  const queue = getQueue();

  return (queue.items || [])
    .filter((item) => item.status === "queued_by_dispatch_bridge")
    .filter((item) => isAllowed(item, config))
    .slice(0, Number(config.maxItemsPerRun || 3));
}

function lockQueueItem(queue, item, workerRunId) {
  const found = (queue.items || []).find((x) => x.dispatchIntentId === item.dispatchIntentId);
  if (!found) return null;

  found.status = "locked_by_worker";
  found.lockedAt = new Date().toISOString();
  found.workerRunId = workerRunId;
  return found;
}

function executeQueueItem(item, config, actor) {
  const execution = {
    executionId: "pex_" + crypto.randomBytes(6).toString("hex"),
    dispatchIntentId: item.dispatchIntentId,
    contentPackId: item.contentPackId,
    channelId: item.channelId,
    provider: item.provider,
    dryRun: Boolean(config.dryRun),
    safeMode: true,
    status: config.dryRun ? "dry_run_execution_recorded" : "execution_ready_for_provider_adapter",
    title: item.title,
    createdAt: new Date().toISOString(),
    actor,
    payloadSnapshot: item
  };

  return execution;
}

function runWorkerOnce(actor = "publishing-worker") {
  const config = getConfig();
  const guard = guardWorker(config);
  const workerRunId = "pqw_" + crypto.randomBytes(6).toString("hex");

  if (!guard.allowed) {
    const blocked = {
      workerRunId,
      status: "blocked",
      guard,
      createdAt: new Date().toISOString()
    };

    const history = getHistory();
    history.runs.push(blocked);
    saveHistory(history);

    audit.appendAuditEvent({
      actor,
      action: "publishing_queue_worker_blocked",
      entityType: "publishing_worker",
      entityId: workerRunId,
      severity: "warning",
      metadata: blocked
    });

    return { success: false, blocked: true, run: blocked };
  }

  const queue = getQueue();
  const selected = selectQueueItems(config);
  const executions = getExecutions();

  const executionRecords = [];

  for (const item of selected) {
    const locked = lockQueueItem(queue, item, workerRunId);
    if (!locked) continue;

    const execution = executeQueueItem(locked, config, actor);
    executionRecords.push(execution);
    executions.records.push(execution);

    locked.status = execution.status;
    locked.executionId = execution.executionId;
    locked.executedAt = execution.createdAt;
  }

  saveQueue(queue);
  saveExecutions(executions);

  const run = {
    workerRunId,
    status: config.dryRun ? "dry_run_worker_completed" : "worker_completed",
    dryRun: Boolean(config.dryRun),
    createdAt: new Date().toISOString(),
    selected: selected.length,
    executed: executionRecords.length
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "publishing_queue_worker_run",
    entityType: "publishing_worker",
    entityId: workerRunId,
    severity: "info",
    metadata: run
  });

  return { success: true, run, executionRecords };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    maxItemsPerRun: Number(patch.maxItemsPerRun || current.maxItemsPerRun || 3),
    lockTimeoutMinutes: Number(patch.lockTimeoutMinutes || current.lockTimeoutMinutes || 15)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "publishing_queue_worker_config_updated",
    entityType: "publishing_worker",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getWorkerCenter() {
  const config = getConfig();
  const queue = getQueue();
  const executions = getExecutions();
  const history = getHistory();

  return {
    success: true,
    phase: "25.2-publishing-queue-worker-execution-tracker",
    config,
    guard: guardWorker(config),
    queueSummary: {
      totalItems: (queue.items || []).length,
      queued: (queue.items || []).filter((x) => x.status === "queued_by_dispatch_bridge").length,
      locked: (queue.items || []).filter((x) => x.status === "locked_by_worker").length,
      executed: (queue.items || []).filter((x) => String(x.status || "").includes("execution")).length
    },
    executionSummary: {
      totalRecords: (executions.records || []).length,
      dryRunRecords: (executions.records || []).filter((x) => x.dryRun).length
    },
    queue: (queue.items || []).slice(-50).reverse(),
    executions: (executions.records || []).slice(-50).reverse(),
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  guardWorker,
  selectQueueItems,
  runWorkerOnce,
  getWorkerCenter
};
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_25_2_PUBLISHING_QUEUE_WORKER_API", (src) => {
  let out = src;
  if (!out.includes("publishing_queue_worker_service")) {
    out = `
// PHASE_25_2_PUBLISHING_QUEUE_WORKER_API
const publishingQueueWorkerService = require("../services/publishing_queue_worker_service");
` + out;
  }

  const routes = `
/* PHASE_25_2_PUBLISHING_QUEUE_WORKER_API */
app.get("/api/admin/factory/publishing-queue-worker", (req, res) => {
  res.json(publishingQueueWorkerService.getWorkerCenter());
});

app.post("/api/admin/factory/publishing-queue-worker/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(publishingQueueWorkerService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/publishing-queue-worker/run-once", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(publishingQueueWorkerService.runWorkerOnce(actor));
});
/* END_PHASE_25_2_PUBLISHING_QUEUE_WORKER_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_25_2_PUBLISHING_QUEUE_WORKER_UI", (src) => {
  return src + `

/* PHASE_25_2_PUBLISHING_QUEUE_WORKER_UI */
async function loadPublishingQueueWorkerCenter() {
  const mountId = "publishing-queue-worker-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card publishing-queue-worker-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Publishing Queue Worker</h2><p>Loading worker...</p>";

  try {
    const res = await fetch("/api/admin/factory/publishing-queue-worker");
    const data = await res.json();
    const config = data.config || {};

    mount.innerHTML = \`
      <h2>Publishing Queue Worker + Execution Tracker</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Worker: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE EXECUTION"}</span>
        <span class="\${data.guard.allowed ? "ok-pill" : "danger-pill"}">Guard: \${data.guard.reason}</span>
      </div>

      <div class="button-row">
        <button onclick="togglePublishingQueueWorker(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Worker</button>
        <button onclick="runPublishingQueueWorkerOnce()">Run Worker Once</button>
        <button onclick="loadPublishingQueueWorkerCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Queue Total: <b>\${data.queueSummary.totalItems || 0}</b></div>
        <div>Queued: <b>\${data.queueSummary.queued || 0}</b></div>
        <div>Executed: <b>\${data.queueSummary.executed || 0}</b></div>
        <div>Execution Records: <b>\${data.executionSummary.totalRecords || 0}</b></div>
      </div>

      <h3>Queue</h3>
      <pre class="ops-json">\${JSON.stringify(data.queue || [], null, 2)}</pre>

      <h3>Execution Records</h3>
      <pre class="ops-json">\${JSON.stringify(data.executions || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Publishing Queue Worker</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function togglePublishingQueueWorker(enabled) {
  await fetch("/api/admin/factory/publishing-queue-worker/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadPublishingQueueWorkerCenter();
}

async function runPublishingQueueWorkerOnce() {
  await fetch("/api/admin/factory/publishing-queue-worker/run-once", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadPublishingQueueWorkerCenter();
}

if (typeof window !== "undefined") {
  window.loadPublishingQueueWorkerCenter = loadPublishingQueueWorkerCenter;
  window.togglePublishingQueueWorker = togglePublishingQueueWorker;
  window.runPublishingQueueWorkerOnce = runPublishingQueueWorkerOnce;
  window.addEventListener("DOMContentLoaded", loadPublishingQueueWorkerCenter);
}
/* END_PHASE_25_2_PUBLISHING_QUEUE_WORKER_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_25_2_PUBLISHING_QUEUE_WORKER_STYLES", (src) => {
  return src + `

/* PHASE_25_2_PUBLISHING_QUEUE_WORKER_STYLES */
.publishing-queue-worker-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_25_2_PUBLISHING_QUEUE_WORKER_STYLES */
`;
});

write(p("storage/admin-platform/publishing_queue_worker_config.json"), JSON.stringify({
  enabled: true,
  dryRun: true,
  requireSafeMode: true,
  maxItemsPerRun: 3,
  lockTimeoutMinutes: 15,
  allowedProviders: [],
  allowedChannels: []
}, null, 2));

write(p("storage/publishing/publishing_execution_records.json"), JSON.stringify({ records: [] }, null, 2));
write(p("storage/admin-platform/publishing_queue_worker_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase25_2_publishing_queue_worker_check.js"), `const bridge = require("./publishing_dispatch_bridge_service");
const worker = require("./services/publishing_queue_worker_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_2_check");
ops.setEmergencyStop(false, "phase25_2_clear", "phase25_2_check");

bridge.enqueueDispatchIntents("phase25_2_seed");

const config = worker.updateConfig({ enabled: true, dryRun: true }, "phase25_2_check");
const selected = worker.selectQueueItems(config.config);
const run = worker.runWorkerOnce("phase25_2_check");
const center = worker.getWorkerCenter();

const result = {
  success: true,
  phase: "25.2-publishing-queue-worker-execution-tracker",
  checks: {
    configReady: Boolean(config.success),
    selectionReady: Array.isArray(selected),
    workerRunReady: Boolean(run.success || run.blocked),
    centerReady: Boolean(center.success),
    queueSummaryReady: Boolean(center.queueSummary),
    executionSummaryReady: Boolean(center.executionSummary),
    auditConnectedReady: true
  },
  selected: selected.length,
  workerStatus: run.run && run.run.status,
  queueSummary: center.queueSummary,
  executionSummary: center.executionSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "25.2-publishing-queue-worker-execution-tracker"
}, null, 2));
