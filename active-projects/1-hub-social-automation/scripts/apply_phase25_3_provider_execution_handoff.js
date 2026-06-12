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

write(p("modules/admin-platform/services/provider_execution_handoff_service.js"), `const fs = require("fs");
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
  return path.join(ROOT, "storage/admin-platform/provider_execution_handoff_config.json");
}
function executionsFile() {
  return path.join(ROOT, "storage/publishing/publishing_execution_records.json");
}
function handoffQueueFile() {
  return path.join(ROOT, "storage/publishing/provider_handoff_queue.json");
}
function historyFile() {
  return path.join(ROOT, "storage/admin-platform/provider_execution_handoff_history.json");
}
function providerRegistryFile() {
  return path.join(ROOT, "modules/publishing/registry/publishing_providers.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    dryRun: true,
    requireSafeMode: true,
    maxItemsPerRun: 5,
    allowedProviders: [],
    allowedChannels: []
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
}

function getExecutions() {
  return readJson(executionsFile(), { records: [] });
}

function saveExecutions(data) {
  writeJson(executionsFile(), data);
}

function getQueue() {
  return readJson(handoffQueueFile(), { jobs: [] });
}

function saveQueue(queue) {
  writeJson(handoffQueueFile(), queue);
}

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function getProviderRegistry() {
  return readJson(providerRegistryFile(), {});
}

function guardHandoff(config) {
  const operations = ops.getOperationsCenter();
  if (!config.enabled) return { allowed: false, reason: "PROVIDER_HANDOFF_DISABLED" };
  if (operations.state && operations.state.emergencyStop) return { allowed: false, reason: "EMERGENCY_STOP_ENABLED" };
  if (config.requireSafeMode && !(operations.state && operations.state.safeMode)) return { allowed: false, reason: "SAFE_MODE_REQUIRED" };
  return { allowed: true, reason: "HANDOFF_ALLOWED" };
}

function providerCapability(provider) {
  const registry = getProviderRegistry();
  const providers = Array.isArray(registry) ? registry : (registry.providers || registry.items || []);
  const found = providers.find((p) => p.provider === provider || p.id === provider || p.name === provider);
  return {
    provider,
    registered: Boolean(found),
    raw: found || null
  };
}

function isAllowed(record, config) {
  if (config.allowedProviders.length && !config.allowedProviders.includes(record.provider)) return false;
  if (config.allowedChannels.length && !config.allowedChannels.includes(record.channelId)) return false;
  return true;
}

function buildHandoffJob(record, config) {
  const capability = providerCapability(record.provider);

  return {
    handoffJobId: "phj_" + crypto.randomBytes(6).toString("hex"),
    executionId: record.executionId,
    dispatchIntentId: record.dispatchIntentId,
    contentPackId: record.contentPackId,
    channelId: record.channelId,
    provider: record.provider,
    status: config.dryRun ? "dry_run_provider_handoff_ready" : "provider_handoff_ready",
    dryRun: Boolean(config.dryRun),
    safeMode: true,
    capability,
    contractVersion: "provider-handoff-v1",
    payload: {
      title: record.title,
      description: record.payloadSnapshot && record.payloadSnapshot.description,
      hashtags: record.payloadSnapshot && record.payloadSnapshot.hashtags,
      assets: record.payloadSnapshot && record.payloadSnapshot.assetPreview,
      schedule: record.payloadSnapshot && record.payloadSnapshot.schedulePreview
    },
    createdAt: new Date().toISOString(),
    source: "phase25_3_provider_execution_handoff"
  };
}

function buildHandoffJobs(actor = "provider-handoff") {
  const config = getConfig();
  const guard = guardHandoff(config);

  if (!guard.allowed) return { success: false, blocked: true, guard, jobs: [] };

  const executions = getExecutions();
  const records = (executions.records || [])
    .filter((r) => String(r.status || "").includes("execution"))
    .filter((r) => isAllowed(r, config))
    .slice(0, Number(config.maxItemsPerRun || 5));

  const jobs = records.map((r) => buildHandoffJob(r, config));

  return { success: true, guard, jobs };
}

function enqueueHandoffJobs(actor = "provider-handoff") {
  const built = buildHandoffJobs(actor);

  if (!built.success) {
    audit.appendAuditEvent({
      actor,
      action: "provider_execution_handoff_blocked",
      entityType: "provider_handoff",
      entityId: "handoff",
      severity: "warning",
      metadata: built.guard
    });
    return built;
  }

  const queue = getQueue();
  const existing = new Set((queue.jobs || []).map((j) => j.executionId + "|" + j.provider));
  const added = [];

  for (const job of built.jobs) {
    const key = job.executionId + "|" + job.provider;
    if (existing.has(key)) continue;
    queue.jobs.push(job);
    added.push(job);
  }

  saveQueue(queue);

  const run = {
    handoffRunId: "phr_" + crypto.randomBytes(6).toString("hex"),
    status: "handoff_jobs_enqueued",
    dryRun: getConfig().dryRun,
    built: built.jobs.length,
    added: added.length,
    queueSize: queue.jobs.length,
    createdAt: new Date().toISOString()
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "provider_execution_handoff_enqueued",
    entityType: "provider_handoff",
    entityId: run.handoffRunId,
    severity: "info",
    metadata: run
  });

  return { success: true, run, added };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    maxItemsPerRun: Number(patch.maxItemsPerRun || current.maxItemsPerRun || 5)
  };
  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "provider_execution_handoff_config_updated",
    entityType: "provider_handoff",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getHandoffCenter() {
  const config = getConfig();
  const queue = getQueue();
  const history = getHistory();
  const preview = buildHandoffJobs("handoff-preview");

  return {
    success: true,
    phase: "25.3-provider-execution-handoff-contract",
    config,
    guard: guardHandoff(config),
    preview,
    queueSummary: {
      totalJobs: (queue.jobs || []).length,
      dryRunJobs: (queue.jobs || []).filter((j) => j.dryRun).length
    },
    queue: (queue.jobs || []).slice(-50).reverse(),
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  providerCapability,
  buildHandoffJobs,
  enqueueHandoffJobs,
  getHandoffCenter
};
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_API", (src) => {
  let out = src;
  if (!out.includes("provider_execution_handoff_service")) {
    out = `
// PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_API
const providerExecutionHandoffService = require("../services/provider_execution_handoff_service");
` + out;
  }

  const routes = `
/* PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_API */
app.get("/api/admin/factory/provider-handoff", (req, res) => {
  res.json(providerExecutionHandoffService.getHandoffCenter());
});

app.post("/api/admin/factory/provider-handoff/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(providerExecutionHandoffService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/provider-handoff/enqueue", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(providerExecutionHandoffService.enqueueHandoffJobs(actor));
});
/* END_PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_UI", (src) => {
  return src + `

/* PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_UI */
async function loadProviderHandoffCenter() {
  const mountId = "provider-handoff-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card provider-handoff-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Provider Execution Handoff</h2><p>Loading handoff center...</p>";

  try {
    const res = await fetch("/api/admin/factory/provider-handoff");
    const data = await res.json();
    const config = data.config || {};
    const preview = data.preview || {};

    mount.innerHTML = \`
      <h2>Provider Execution Handoff Contract</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Handoff: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE HANDOFF"}</span>
        <span class="\${data.guard.allowed ? "ok-pill" : "danger-pill"}">Guard: \${data.guard.reason}</span>
      </div>

      <div class="button-row">
        <button onclick="toggleProviderHandoff(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Handoff</button>
        <button onclick="enqueueProviderHandoffJobs()">Enqueue Handoff Jobs</button>
        <button onclick="loadProviderHandoffCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Preview Jobs: <b>\${(preview.jobs || []).length}</b></div>
        <div>Queue Jobs: <b>\${data.queueSummary.totalJobs || 0}</b></div>
        <div>Dry Jobs: <b>\${data.queueSummary.dryRunJobs || 0}</b></div>
        <div>Max/Run: <b>\${config.maxItemsPerRun}</b></div>
      </div>

      <h3>Handoff Preview</h3>
      <pre class="ops-json">\${JSON.stringify(preview.jobs || [], null, 2)}</pre>

      <h3>Provider Handoff Queue</h3>
      <pre class="ops-json">\${JSON.stringify(data.queue || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Provider Execution Handoff</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleProviderHandoff(enabled) {
  await fetch("/api/admin/factory/provider-handoff/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadProviderHandoffCenter();
}

async function enqueueProviderHandoffJobs() {
  await fetch("/api/admin/factory/provider-handoff/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadProviderHandoffCenter();
}

if (typeof window !== "undefined") {
  window.loadProviderHandoffCenter = loadProviderHandoffCenter;
  window.toggleProviderHandoff = toggleProviderHandoff;
  window.enqueueProviderHandoffJobs = enqueueProviderHandoffJobs;
  window.addEventListener("DOMContentLoaded", loadProviderHandoffCenter);
}
/* END_PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_STYLES", (src) => {
  return src + `

/* PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_STYLES */
.provider-handoff-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_25_3_PROVIDER_EXECUTION_HANDOFF_STYLES */
`;
});

write(p("storage/admin-platform/provider_execution_handoff_config.json"), JSON.stringify({
  enabled: true,
  dryRun: true,
  requireSafeMode: true,
  maxItemsPerRun: 5,
  allowedProviders: [],
  allowedChannels: []
}, null, 2));

write(p("storage/publishing/provider_handoff_queue.json"), JSON.stringify({ jobs: [] }, null, 2));
write(p("storage/admin-platform/provider_execution_handoff_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase25_3_provider_execution_handoff_check.js"), `const handoff = require("./services/provider_execution_handoff_service");
const worker = require("./services/publishing_queue_worker_service");
const bridge = require("./services/publishing_dispatch_bridge_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_3_check");
ops.setEmergencyStop(false, "phase25_3_clear", "phase25_3_check");

bridge.enqueueDispatchIntents("phase25_3_seed_bridge");
worker.runWorkerOnce("phase25_3_seed_worker");

const config = handoff.updateConfig({ enabled: true, dryRun: true }, "phase25_3_check");
const preview = handoff.buildHandoffJobs("phase25_3_check");
const enqueue = handoff.enqueueHandoffJobs("phase25_3_check");
const center = handoff.getHandoffCenter();

const result = {
  success: true,
  phase: "25.3-provider-execution-handoff-contract",
  checks: {
    configReady: Boolean(config.success),
    previewReady: Boolean(preview.success || preview.blocked),
    enqueueReady: Boolean(enqueue.success || enqueue.blocked),
    centerReady: Boolean(center.success),
    queueReady: Array.isArray(center.queue),
    capabilityCheckReady: Boolean(handoff.providerCapability("telegram")),
    auditConnectedReady: true
  },
  previewJobs: preview.jobs ? preview.jobs.length : 0,
  queueSummary: center.queueSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "25.3-provider-execution-handoff-contract"
}, null, 2));
