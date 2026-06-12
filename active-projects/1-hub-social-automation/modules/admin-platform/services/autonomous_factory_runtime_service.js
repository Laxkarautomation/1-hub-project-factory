const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const ops = require("./factory_operations_service");
const packs = require("./content_pack_preview_service");

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
  return path.join(ROOT, "storage/admin-platform/autonomous_runtime_config.json");
}

function stateFile() {
  return path.join(ROOT, "storage/admin-platform/autonomous_runtime_state.json");
}

function runHistoryFile() {
  return path.join(ROOT, "storage/admin-platform/autonomous_runtime_runs.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: false,
    dryRun: true,
    requirePublishableStatus: true,
    requireSafeMode: true,
    autoApprovePublishable: false,
    maxPacksPerRun: 3,
    allowedProviders: [],
    allowedChannels: [],
    scheduleMode: "manual_safe",
    timezone: "Asia/Kolkata"
  });
}

function saveConfig(next) {
  writeJson(configFile(), next);
  return next;
}

function getState() {
  return readJson(stateFile(), {
    enabled: false,
    lastRunAt: null,
    lastRunId: null,
    lastStatus: "never_run"
  });
}

function saveState(next) {
  writeJson(stateFile(), next);
  return next;
}

function getHistory() {
  return readJson(runHistoryFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(runHistoryFile(), history);
}

function guardRuntime(config) {
  const center = ops.getOperationsCenter();
  const emergencyStop = Boolean(center.state && center.state.emergencyStop);

  if (emergencyStop) {
    return { allowed: false, reason: "EMERGENCY_STOP_ENABLED" };
  }

  if (config.requireSafeMode && !(center.state && center.state.safeMode)) {
    return { allowed: false, reason: "SAFE_MODE_REQUIRED" };
  }

  if (!config.enabled) {
    return { allowed: false, reason: "AUTONOMOUS_RUNTIME_DISABLED" };
  }

  return { allowed: true, reason: "RUNTIME_ALLOWED" };
}

function buildDispatchPlan(config) {
  const listed = packs.listContentPacks();
  let candidates = listed.packs || [];

  if (config.requirePublishableStatus) {
    candidates = candidates.filter((p) => p.status === "publishable");
  }

  if (config.allowedChannels && config.allowedChannels.length) {
    candidates = candidates.filter((p) => config.allowedChannels.includes(p.channelId));
  }

  candidates = candidates.filter((p) => {
    if (!config.allowedProviders || !config.allowedProviders.length) return true;
    return (p.providerTargets || []).some((provider) => config.allowedProviders.includes(provider));
  });

  candidates = candidates.slice(0, Number(config.maxPacksPerRun || 3));

  return candidates.map((pack) => {
    const providers = (pack.providerTargets || []).filter((provider) => {
      if (!config.allowedProviders || !config.allowedProviders.length) return true;
      return config.allowedProviders.includes(provider);
    });

    return {
      contentPackId: pack.contentPackId,
      channelId: pack.channelId,
      title: pack.title,
      status: pack.status,
      safeMode: true,
      dryRun: Boolean(config.dryRun),
      providers,
      schedulePreview: pack.schedule || null,
      approvalRequired: !pack.approval || !pack.approval.approved,
      canAutoApprove: Boolean(config.autoApprovePublishable && pack.status === "publishable")
    };
  });
}

function runOnce(actor = "runtime") {
  const config = getConfig();
  const guard = guardRuntime(config);
  const runId = "afr_" + crypto.randomBytes(6).toString("hex");

  if (!guard.allowed) {
    const blocked = {
      runId,
      status: "blocked",
      reason: guard.reason,
      createdAt: new Date().toISOString()
    };

    const history = getHistory();
    history.runs.push(blocked);
    saveHistory(history);

    saveState({
      enabled: config.enabled,
      lastRunAt: blocked.createdAt,
      lastRunId: runId,
      lastStatus: "blocked"
    });

    audit.appendAuditEvent({
      actor,
      action: "autonomous_runtime_blocked",
      entityType: "factory_runtime",
      entityId: runId,
      severity: "warning",
      metadata: blocked
    });

    return { success: false, blocked: true, run: blocked };
  }

  const plan = buildDispatchPlan(config);
  const launchResults = [];

  for (const item of plan) {
    if (item.approvalRequired && item.canAutoApprove) {
      packs.approveContentPack(item.contentPackId, actor);
      item.approvalRequired = false;
      item.autoApproved = true;
    }

    if (!item.approvalRequired) {
      const launch = packs.launchContentPack(item.contentPackId, {
        providers: item.providers,
        safeMode: true,
        actor
      });
      launchResults.push(launch);
    } else {
      launchResults.push({
        success: false,
        contentPackId: item.contentPackId,
        reason: "APPROVAL_REQUIRED"
      });
    }
  }

  const run = {
    runId,
    status: config.dryRun ? "dry_run_completed" : "safe_dispatch_completed",
    dryRun: Boolean(config.dryRun),
    createdAt: new Date().toISOString(),
    plan,
    launchResults
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  saveState({
    enabled: config.enabled,
    lastRunAt: run.createdAt,
    lastRunId: runId,
    lastStatus: run.status
  });

  audit.appendAuditEvent({
    actor,
    action: "autonomous_runtime_run",
    entityType: "factory_runtime",
    entityId: runId,
    severity: "info",
    metadata: {
      status: run.status,
      plannedItems: plan.length,
      dryRun: run.dryRun
    }
  });

  return { success: true, run };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    requirePublishableStatus: patch.requirePublishableStatus === undefined ? current.requirePublishableStatus : Boolean(patch.requirePublishableStatus),
    autoApprovePublishable: patch.autoApprovePublishable === undefined ? current.autoApprovePublishable : Boolean(patch.autoApprovePublishable)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_runtime_config_updated",
    entityType: "factory_runtime",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getRuntimeCenter() {
  const config = getConfig();
  const state = getState();
  const history = getHistory();
  const guard = guardRuntime(config);
  const dispatchPlan = buildDispatchPlan(config);

  return {
    success: true,
    phase: "24.1-autonomous-factory-runtime-foundation",
    config,
    state,
    guard,
    dispatchPlan,
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  getRuntimeCenter,
  buildDispatchPlan,
  runOnce
};
