const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const ops = require("./factory_operations_service");
const packs = require("./content_pack_preview_service");
const gated = require("./decision_gated_dispatch_service");

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
  return path.join(ROOT, "storage/admin-platform/publishing_dispatch_bridge_config.json");
}

function queueFile() {
  return path.join(ROOT, "storage/publishing/dispatch_bridge_queue.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/publishing_dispatch_bridge_history.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    dryRun: true,
    requireSafeMode: true,
    requireDecisionGate: true,
    maxItemsPerBridgeRun: 5,
    queueStatus: "queued_by_dispatch_bridge",
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

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function guardBridge(config) {
  const operations = ops.getOperationsCenter();

  if (!config.enabled) {
    return { allowed: false, reason: "PUBLISHING_DISPATCH_BRIDGE_DISABLED" };
  }

  if (operations.state && operations.state.emergencyStop) {
    return { allowed: false, reason: "EMERGENCY_STOP_ENABLED" };
  }

  if (config.requireSafeMode && !(operations.state && operations.state.safeMode)) {
    return { allowed: false, reason: "SAFE_MODE_REQUIRED" };
  }

  return { allowed: true, reason: "BRIDGE_ALLOWED" };
}

function buildProviderPayload(pack, provider, config) {
  const preview = packs.getPreview(pack.contentPackId);
  const data = preview.preview || pack;

  return {
    dispatchIntentId: "dpi_" + crypto.randomBytes(6).toString("hex"),
    contentPackId: data.contentPackId,
    channelId: data.channelId,
    provider,
    status: config.queueStatus,
    dryRun: Boolean(config.dryRun),
    safeMode: true,
    title: data.title,
    description: data.description,
    hashtags: data.hashtags || [],
    schedulePreview: data.schedulePreview || data.schedule || null,
    assetPreview: data.assetPreview || [],
    providerLaunchPreview: data.providerLaunchPreview || [],
    createdAt: new Date().toISOString(),
    source: "phase25_1_publishing_dispatch_bridge"
  };
}

function buildDispatchIntents(actor = "dispatch-bridge") {
  const config = getConfig();
  const guard = guardBridge(config);

  if (!guard.allowed) {
    return { success: false, blocked: true, guard, intents: [] };
  }

  const gate = gated.evaluateGate(actor);
  let allowed = gate.allowed || [];

  if (config.allowedChannels.length) {
    allowed = allowed.filter((x) => config.allowedChannels.includes(x.channelId));
  }

  allowed = allowed.slice(0, Number(config.maxItemsPerBridgeRun || 5));

  const intents = [];

  for (const pack of allowed) {
    let providers = pack.providerTargets || [];
    if (config.allowedProviders.length) {
      providers = providers.filter((p) => config.allowedProviders.includes(p));
    }

    for (const provider of providers) {
      intents.push(buildProviderPayload(pack, provider, config));
    }
  }

  return {
    success: true,
    guard,
    gateSummary: {
      totalDecisions: gate.totalDecisions,
      allowedCount: gate.allowedCount
    },
    intents
  };
}

function enqueueDispatchIntents(actor = "dispatch-bridge") {
  const config = getConfig();
  const built = buildDispatchIntents(actor);

  if (!built.success) {
    audit.appendAuditEvent({
      actor,
      action: "publishing_dispatch_bridge_blocked",
      entityType: "publishing_bridge",
      entityId: "bridge",
      severity: "warning",
      metadata: built.guard
    });

    return built;
  }

  const queue = getQueue();
  const existing = new Set((queue.items || []).map((x) => [
    x.contentPackId,
    x.provider,
    x.channelId,
    x.status
  ].join("|")));

  const added = [];

  for (const intent of built.intents) {
    const key = [intent.contentPackId, intent.provider, intent.channelId, intent.status].join("|");
    if (existing.has(key)) continue;
    queue.items.push(intent);
    added.push(intent);
  }

  saveQueue(queue);

  const run = {
    bridgeRunId: "pbr_" + crypto.randomBytes(6).toString("hex"),
    status: config.dryRun ? "dry_run_bridge_completed" : "bridge_completed",
    dryRun: Boolean(config.dryRun),
    createdAt: new Date().toISOString(),
    built: built.intents.length,
    added: added.length,
    queueSize: queue.items.length
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "publishing_dispatch_bridge_enqueued",
    entityType: "publishing_bridge",
    entityId: run.bridgeRunId,
    severity: "info",
    metadata: run
  });

  return { success: true, run, added, queueSize: queue.items.length };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    requireDecisionGate: patch.requireDecisionGate === undefined ? current.requireDecisionGate : Boolean(patch.requireDecisionGate),
    maxItemsPerBridgeRun: Number(patch.maxItemsPerBridgeRun || current.maxItemsPerBridgeRun || 5)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "publishing_dispatch_bridge_config_updated",
    entityType: "publishing_bridge",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getBridgeCenter() {
  const config = getConfig();
  const queue = getQueue();
  const history = getHistory();
  const preview = buildDispatchIntents("bridge-preview");

  return {
    success: true,
    phase: "25.1-publishing-dispatch-bridge-hardening",
    config,
    guard: guardBridge(config),
    preview,
    queueSummary: {
      totalItems: (queue.items || []).length,
      dryRunItems: (queue.items || []).filter((x) => x.dryRun).length
    },
    queue: (queue.items || []).slice(-50).reverse(),
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  guardBridge,
  buildDispatchIntents,
  enqueueDispatchIntents,
  getBridgeCenter
};
