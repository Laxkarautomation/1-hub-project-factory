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

write(p("modules/admin-platform/services/provider_adapter_executor_service.js"), `const fs = require("fs");
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
  return path.join(ROOT, "storage/admin-platform/provider_adapter_executor_config.json");
}
function handoffQueueFile() {
  return path.join(ROOT, "storage/publishing/provider_handoff_queue.json");
}
function resultsFile() {
  return path.join(ROOT, "storage/publishing/provider_execution_results.json");
}
function historyFile() {
  return path.join(ROOT, "storage/admin-platform/provider_adapter_executor_history.json");
}
function providerRegistryFile() {
  return path.join(ROOT, "modules/publishing/registry/publishing_providers.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    dryRun: true,
    requireSafeMode: true,
    maxJobsPerRun: 3,
    allowedProviders: [],
    allowedChannels: [],
    realExecutionAllowed: false
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
}

function getQueue() {
  return readJson(handoffQueueFile(), { jobs: [] });
}

function saveQueue(queue) {
  writeJson(handoffQueueFile(), queue);
}

function getResults() {
  return readJson(resultsFile(), { results: [] });
}

function saveResults(results) {
  writeJson(resultsFile(), results);
}

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function guardExecutor(config) {
  const operations = ops.getOperationsCenter();

  if (!config.enabled) return { allowed: false, reason: "PROVIDER_ADAPTER_EXECUTOR_DISABLED" };
  if (operations.state && operations.state.emergencyStop) return { allowed: false, reason: "EMERGENCY_STOP_ENABLED" };
  if (config.requireSafeMode && !(operations.state && operations.state.safeMode)) return { allowed: false, reason: "SAFE_MODE_REQUIRED" };
  if (!config.dryRun && !config.realExecutionAllowed) return { allowed: false, reason: "REAL_PROVIDER_EXECUTION_NOT_ALLOWED" };

  return { allowed: true, reason: "EXECUTOR_ALLOWED" };
}

function providerAdapterResolver(provider) {
  const registry = readJson(providerRegistryFile(), {});
  const providers = Array.isArray(registry) ? registry : (registry.providers || registry.items || []);
  const found = providers.find((p) => p.provider === provider || p.id === provider || p.name === provider);

  const adapterCandidates = [
    "modules/publishing/providers/" + provider + "/" + provider + "_real_publisher.js",
    "modules/publishing/providers/" + provider + "/" + provider + "_publisher.js",
    "modules/publishing/adapters/" + provider + "_publishing_adapter.js"
  ];

  const existingAdapter = adapterCandidates.find((rel) => fs.existsSync(path.join(ROOT, rel)));

  return {
    provider,
    registered: Boolean(found),
    registryRecord: found || null,
    adapterFound: Boolean(existingAdapter),
    adapterPath: existingAdapter || null,
    adapterCandidates
  };
}

function isAllowed(job, config) {
  if (config.allowedProviders.length && !config.allowedProviders.includes(job.provider)) return false;
  if (config.allowedChannels.length && !config.allowedChannels.includes(job.channelId)) return false;
  return true;
}

function selectJobs(config) {
  const queue = getQueue();
  return (queue.jobs || [])
    .filter((j) => String(j.status || "").includes("provider_handoff_ready"))
    .filter((j) => isAllowed(j, config))
    .slice(0, Number(config.maxJobsPerRun || 3));
}

function executeJob(job, config, actor) {
  const resolver = providerAdapterResolver(job.provider);

  const result = {
    providerResultId: "per_" + crypto.randomBytes(6).toString("hex"),
    handoffJobId: job.handoffJobId,
    executionId: job.executionId,
    contentPackId: job.contentPackId,
    channelId: job.channelId,
    provider: job.provider,
    dryRun: Boolean(config.dryRun),
    safeMode: true,
    resolver,
    status: config.dryRun ? "dry_run_provider_execution_proof" : "provider_execution_pending_real_adapter",
    createdAt: new Date().toISOString(),
    actor,
    payloadSnapshot: job.payload
  };

  if (!resolver.registered) {
    result.status = "provider_not_registered";
    result.retryable = false;
  } else if (!resolver.adapterFound) {
    result.status = config.dryRun ? "dry_run_adapter_missing_proof" : "provider_adapter_missing";
    result.retryable = true;
  }

  return result;
}

function runExecutorOnce(actor = "provider-executor") {
  const config = getConfig();
  const guard = guardExecutor(config);
  const executorRunId = "pae_" + crypto.randomBytes(6).toString("hex");

  if (!guard.allowed) {
    const blocked = {
      executorRunId,
      status: "blocked",
      guard,
      createdAt: new Date().toISOString()
    };

    const history = getHistory();
    history.runs.push(blocked);
    saveHistory(history);

    audit.appendAuditEvent({
      actor,
      action: "provider_adapter_executor_blocked",
      entityType: "provider_executor",
      entityId: executorRunId,
      severity: "warning",
      metadata: blocked
    });

    return { success: false, blocked: true, run: blocked };
  }

  const queue = getQueue();
  const selected = selectJobs(config);
  const results = getResults();
  const executionResults = [];

  for (const job of selected) {
    const liveJob = (queue.jobs || []).find((j) => j.handoffJobId === job.handoffJobId);
    if (!liveJob) continue;

    liveJob.status = "locked_by_provider_executor";
    liveJob.lockedAt = new Date().toISOString();
    liveJob.executorRunId = executorRunId;

    const result = executeJob(liveJob, config, actor);
    executionResults.push(result);
    results.results.push(result);

    liveJob.status = result.status;
    liveJob.providerResultId = result.providerResultId;
    liveJob.executedAt = result.createdAt;
  }

  saveQueue(queue);
  saveResults(results);

  const run = {
    executorRunId,
    status: config.dryRun ? "dry_run_provider_executor_completed" : "provider_executor_completed",
    dryRun: Boolean(config.dryRun),
    selected: selected.length,
    executed: executionResults.length,
    createdAt: new Date().toISOString()
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "provider_adapter_executor_run",
    entityType: "provider_executor",
    entityId: executorRunId,
    severity: "info",
    metadata: run
  });

  return { success: true, run, executionResults };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    realExecutionAllowed: patch.realExecutionAllowed === undefined ? current.realExecutionAllowed : Boolean(patch.realExecutionAllowed),
    maxJobsPerRun: Number(patch.maxJobsPerRun || current.maxJobsPerRun || 3)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "provider_adapter_executor_config_updated",
    entityType: "provider_executor",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getExecutorCenter() {
  const config = getConfig();
  const queue = getQueue();
  const results = getResults();
  const history = getHistory();

  return {
    success: true,
    phase: "25.4-provider-adapter-executor-shell",
    config,
    guard: guardExecutor(config),
    queueSummary: {
      totalJobs: (queue.jobs || []).length,
      ready: (queue.jobs || []).filter((j) => String(j.status || "").includes("provider_handoff_ready")).length,
      executed: (queue.jobs || []).filter((j) => String(j.status || "").includes("provider_execution") || String(j.status || "").includes("adapter")).length
    },
    resultSummary: {
      totalResults: (results.results || []).length,
      dryRunProofs: (results.results || []).filter((r) => r.dryRun).length,
      adapterMissing: (results.results || []).filter((r) => String(r.status || "").includes("adapter_missing")).length
    },
    queue: (queue.jobs || []).slice(-50).reverse(),
    results: (results.results || []).slice(-50).reverse(),
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  providerAdapterResolver,
  selectJobs,
  runExecutorOnce,
  getExecutorCenter
};
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_API", (src) => {
  let out = src;
  if (!out.includes("provider_adapter_executor_service")) {
    out = `
// PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_API
const providerAdapterExecutorService = require("../services/provider_adapter_executor_service");
` + out;
  }

  const routes = `
/* PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_API */
app.get("/api/admin/factory/provider-executor", (req, res) => {
  res.json(providerAdapterExecutorService.getExecutorCenter());
});

app.post("/api/admin/factory/provider-executor/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(providerAdapterExecutorService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/provider-executor/run-once", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(providerAdapterExecutorService.runExecutorOnce(actor));
});
/* END_PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_UI", (src) => {
  return src + `

/* PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_UI */
async function loadProviderExecutorCenter() {
  const mountId = "provider-executor-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card provider-executor-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Provider Adapter Executor</h2><p>Loading executor...</p>";

  try {
    const res = await fetch("/api/admin/factory/provider-executor");
    const data = await res.json();
    const config = data.config || {};

    mount.innerHTML = \`
      <h2>Provider Adapter Executor Shell</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Executor: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE PROVIDER"}</span>
        <span class="\${data.guard.allowed ? "ok-pill" : "danger-pill"}">Guard: \${data.guard.reason}</span>
      </div>

      <div class="button-row">
        <button onclick="toggleProviderExecutor(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Executor</button>
        <button onclick="runProviderExecutorOnce()">Run Executor Once</button>
        <button onclick="loadProviderExecutorCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Ready Jobs: <b>\${data.queueSummary.ready || 0}</b></div>
        <div>Executed Jobs: <b>\${data.queueSummary.executed || 0}</b></div>
        <div>Results: <b>\${data.resultSummary.totalResults || 0}</b></div>
        <div>Dry Proofs: <b>\${data.resultSummary.dryRunProofs || 0}</b></div>
      </div>

      <h3>Provider Execution Results</h3>
      <pre class="ops-json">\${JSON.stringify(data.results || [], null, 2)}</pre>

      <h3>Provider Handoff Queue</h3>
      <pre class="ops-json">\${JSON.stringify(data.queue || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Provider Adapter Executor</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleProviderExecutor(enabled) {
  await fetch("/api/admin/factory/provider-executor/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadProviderExecutorCenter();
}

async function runProviderExecutorOnce() {
  await fetch("/api/admin/factory/provider-executor/run-once", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadProviderExecutorCenter();
}

if (typeof window !== "undefined") {
  window.loadProviderExecutorCenter = loadProviderExecutorCenter;
  window.toggleProviderExecutor = toggleProviderExecutor;
  window.runProviderExecutorOnce = runProviderExecutorOnce;
  window.addEventListener("DOMContentLoaded", loadProviderExecutorCenter);
}
/* END_PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_STYLES", (src) => {
  return src + `

/* PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_STYLES */
.provider-executor-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_25_4_PROVIDER_ADAPTER_EXECUTOR_STYLES */
`;
});

write(p("storage/admin-platform/provider_adapter_executor_config.json"), JSON.stringify({
  enabled: true,
  dryRun: true,
  requireSafeMode: true,
  maxJobsPerRun: 3,
  allowedProviders: [],
  allowedChannels: [],
  realExecutionAllowed: false
}, null, 2));

write(p("storage/publishing/provider_execution_results.json"), JSON.stringify({ results: [] }, null, 2));
write(p("storage/admin-platform/provider_adapter_executor_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase25_4_provider_adapter_executor_check.js"), `const executor = require("./services/provider_adapter_executor_service");
const handoff = require("./services/provider_execution_handoff_service");
const worker = require("./services/publishing_queue_worker_service");
const bridge = require("./services/publishing_dispatch_bridge_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_4_check");
ops.setEmergencyStop(false, "phase25_4_clear", "phase25_4_check");

bridge.enqueueDispatchIntents("phase25_4_seed_bridge");
worker.runWorkerOnce("phase25_4_seed_worker");
handoff.enqueueHandoffJobs("phase25_4_seed_handoff");

const config = executor.updateConfig({ enabled: true, dryRun: true }, "phase25_4_check");
const selected = executor.selectJobs(config.config);
const run = executor.runExecutorOnce("phase25_4_check");
const center = executor.getExecutorCenter();

const result = {
  success: true,
  phase: "25.4-provider-adapter-executor-shell",
  checks: {
    configReady: Boolean(config.success),
    resolverReady: Boolean(executor.providerAdapterResolver("telegram")),
    selectionReady: Array.isArray(selected),
    executorRunReady: Boolean(run.success || run.blocked),
    centerReady: Boolean(center.success),
    resultSummaryReady: Boolean(center.resultSummary),
    auditConnectedReady: true
  },
  selected: selected.length,
  executorStatus: run.run && run.run.status,
  resultSummary: center.resultSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "25.4-provider-adapter-executor-shell"
}, null, 2));
