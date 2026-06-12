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
