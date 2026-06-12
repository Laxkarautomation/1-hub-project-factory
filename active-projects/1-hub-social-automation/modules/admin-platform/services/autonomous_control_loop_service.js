const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const ops = require("./factory_operations_service");
const scheduler = require("./autonomous_scheduler_service");
const gate = require("./decision_gated_dispatch_service");
const retry = require("./self_healing_retry_service");

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
  return path.join(ROOT, "storage/admin-platform/autonomous_control_loop_config.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/autonomous_control_loop_history.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: false,
    dryRun: true,
    requireSafeMode: true,
    requireSchedulerDue: false,
    runDecisionGate: true,
    runDispatch: true,
    scanRetriesAfterCycle: true,
    runRetryAfterScan: false,
    maxCyclesPerManualRun: 1
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
}

function getHistory() {
  return readJson(historyFile(), { cycles: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function guardCycle(config) {
  const operations = ops.getOperationsCenter();

  if (operations.state && operations.state.emergencyStop) {
    return { allowed: false, reason: "EMERGENCY_STOP_ENABLED" };
  }

  if (config.requireSafeMode && !(operations.state && operations.state.safeMode)) {
    return { allowed: false, reason: "SAFE_MODE_REQUIRED" };
  }

  if (!config.enabled) {
    return { allowed: false, reason: "CONTROL_LOOP_DISABLED" };
  }

  if (config.requireSchedulerDue) {
    const due = scheduler.isDue();
    if (!due.due) return { allowed: false, reason: "SCHEDULER_NOT_DUE", due };
  }

  return { allowed: true, reason: "CONTROL_LOOP_ALLOWED" };
}

function runCycle(actor = "control-loop") {
  const config = getConfig();
  const cycleId = "acl_" + crypto.randomBytes(6).toString("hex");
  const guard = guardCycle(config);

  if (!guard.allowed) {
    const blocked = {
      cycleId,
      status: "blocked",
      guard,
      createdAt: new Date().toISOString()
    };

    const history = getHistory();
    history.cycles.push(blocked);
    saveHistory(history);

    audit.appendAuditEvent({
      actor,
      action: "autonomous_control_loop_blocked",
      entityType: "control_loop",
      entityId: cycleId,
      severity: "warning",
      metadata: blocked
    });

    return { success: false, blocked: true, cycle: blocked };
  }

  const steps = [];

  const schedulerCenter = scheduler.getSchedulerCenter();
  steps.push({ step: "scheduler_status", success: true, result: schedulerCenter.due });

  let gatePreview = null;
  if (config.runDecisionGate) {
    gatePreview = gate.evaluateGate(actor);
    steps.push({ step: "decision_gate_evaluated", success: gatePreview.success, result: {
      totalDecisions: gatePreview.totalDecisions,
      allowedCount: gatePreview.allowedCount
    }});
  }

  let dispatchRun = null;
  if (config.runDispatch) {
    dispatchRun = gate.runDecisionGatedDispatch(actor);
    steps.push({ step: "decision_gated_dispatch", success: dispatchRun.success, result: {
      status: dispatchRun.run && dispatchRun.run.status,
      results: dispatchRun.run && dispatchRun.run.results ? dispatchRun.run.results.length : 0
    }});
  }

  let retryScan = null;
  if (config.scanRetriesAfterCycle) {
    retryScan = retry.scanRuntimeFailures(actor);
    steps.push({ step: "retry_scan", success: retryScan.success, result: {
      added: retryScan.added ? retryScan.added.length : 0,
      totalQueued: retryScan.totalQueued
    }});
  }

  let retryRun = null;
  if (config.runRetryAfterScan) {
    retryRun = retry.runNextRetry(actor);
    steps.push({ step: "retry_next", success: retryRun.success, result: retryRun });
  }

  const cycle = {
    cycleId,
    status: "completed",
    dryRun: config.dryRun,
    createdAt: new Date().toISOString(),
    guard,
    steps,
    gatePreview,
    dispatchRun,
    retryScan,
    retryRun
  };

  const history = getHistory();
  history.cycles.push(cycle);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_control_loop_cycle",
    entityType: "control_loop",
    entityId: cycleId,
    severity: "info",
    metadata: {
      status: cycle.status,
      steps: steps.map((s) => s.step),
      dryRun: config.dryRun
    }
  });

  return { success: true, cycle };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    requireSafeMode: patch.requireSafeMode === undefined ? current.requireSafeMode : Boolean(patch.requireSafeMode),
    requireSchedulerDue: patch.requireSchedulerDue === undefined ? current.requireSchedulerDue : Boolean(patch.requireSchedulerDue),
    runDecisionGate: patch.runDecisionGate === undefined ? current.runDecisionGate : Boolean(patch.runDecisionGate),
    runDispatch: patch.runDispatch === undefined ? current.runDispatch : Boolean(patch.runDispatch),
    scanRetriesAfterCycle: patch.scanRetriesAfterCycle === undefined ? current.scanRetriesAfterCycle : Boolean(patch.scanRetriesAfterCycle),
    runRetryAfterScan: patch.runRetryAfterScan === undefined ? current.runRetryAfterScan : Boolean(patch.runRetryAfterScan),
    maxCyclesPerManualRun: Number(patch.maxCyclesPerManualRun || current.maxCyclesPerManualRun || 1)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_control_loop_config_updated",
    entityType: "control_loop",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getControlLoopCenter() {
  const config = getConfig();
  const history = getHistory();

  return {
    success: true,
    phase: "24.6-autonomous-control-loop-orchestrator",
    config,
    guard: guardCycle(config),
    scheduler: scheduler.getSchedulerCenter(),
    decisionGate: gate.getDispatchGateCenter(),
    retry: retry.getRetryCenter(),
    recentCycles: (history.cycles || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  guardCycle,
  runCycle,
  getControlLoopCenter
};
