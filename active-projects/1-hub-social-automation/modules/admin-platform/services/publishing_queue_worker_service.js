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
