const fs = require("fs");
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
