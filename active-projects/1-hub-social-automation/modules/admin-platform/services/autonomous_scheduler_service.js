const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
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
  return path.join(ROOT, "storage/admin-platform/autonomous_scheduler_config.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/autonomous_scheduler_history.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: false,
    timezone: "Asia/Kolkata",
    intervalMinutes: 60,
    allowedHours: [9,10,11,12,13,14,15,16,17,18,19,20,21],
    manualRunWindowEnabled: true,
    maxRunsPerDay: 12,
    channelFilters: [],
    providerFilters: [],
    lastEvaluatedAt: null
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
  return config;
}

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function runsToday(history) {
  const key = todayKey();
  return (history.runs || []).filter((r) => String(r.createdAt || "").startsWith(key)).length;
}

function buildCronPlan() {
  const config = getConfig();
  const runtimeCenter = runtime.getRuntimeCenter();

  return {
    success: true,
    phase: "24.2-autonomous-scheduler-cron-control",
    config,
    runtimeGuard: runtimeCenter.guard,
    nextEvaluationMode: config.enabled ? "scheduler_enabled" : "scheduler_disabled",
    intervalMinutes: config.intervalMinutes,
    allowedHours: config.allowedHours,
    runtimeDispatchPlanCount: (runtimeCenter.dispatchPlan || []).length
  };
}

function isDue(now = new Date()) {
  const config = getConfig();
  const history = getHistory();
  const hour = now.getHours();

  if (!config.enabled) return { due: false, reason: "SCHEDULER_DISABLED" };
  if (!config.allowedHours.includes(hour)) return { due: false, reason: "OUTSIDE_ALLOWED_HOURS" };
  if (runsToday(history) >= Number(config.maxRunsPerDay || 12)) return { due: false, reason: "MAX_RUNS_PER_DAY_REACHED" };

  const last = history.runs && history.runs.length ? history.runs[history.runs.length - 1] : null;
  if (!last) return { due: true, reason: "NO_PREVIOUS_RUN" };

  const diffMs = now.getTime() - new Date(last.createdAt).getTime();
  const diffMin = diffMs / 60000;

  if (diffMin >= Number(config.intervalMinutes || 60)) {
    return { due: true, reason: "INTERVAL_REACHED", diffMin };
  }

  return { due: false, reason: "INTERVAL_NOT_REACHED", diffMin };
}

function evaluateAndRun(actor = "scheduler") {
  const scheduleRunId = "sch_" + crypto.randomBytes(6).toString("hex");
  const config = getConfig();
  const due = isDue();

  config.lastEvaluatedAt = new Date().toISOString();
  saveConfig(config);

  if (!due.due) {
    const skipped = {
      scheduleRunId,
      status: "skipped",
      reason: due.reason,
      createdAt: new Date().toISOString()
    };

    const history = getHistory();
    history.runs.push(skipped);
    saveHistory(history);

    audit.appendAuditEvent({
      actor,
      action: "autonomous_scheduler_skipped",
      entityType: "factory_scheduler",
      entityId: scheduleRunId,
      severity: "info",
      metadata: skipped
    });

    return { success: true, skipped: true, run: skipped };
  }

  const runtimeRun = runtime.runOnce(actor);

  const run = {
    scheduleRunId,
    status: runtimeRun.success ? "runtime_triggered" : "runtime_blocked",
    due,
    runtimeRun,
    createdAt: new Date().toISOString()
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_scheduler_evaluated",
    entityType: "factory_scheduler",
    entityId: scheduleRunId,
    severity: runtimeRun.success ? "info" : "warning",
    metadata: {
      status: run.status,
      due,
      runtimeStatus: runtimeRun.run && runtimeRun.run.status
    }
  });

  return { success: true, run };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    manualRunWindowEnabled: patch.manualRunWindowEnabled === undefined ? current.manualRunWindowEnabled : Boolean(patch.manualRunWindowEnabled),
    intervalMinutes: Number(patch.intervalMinutes || current.intervalMinutes || 60),
    maxRunsPerDay: Number(patch.maxRunsPerDay || current.maxRunsPerDay || 12)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_scheduler_config_updated",
    entityType: "factory_scheduler",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getSchedulerCenter() {
  const config = getConfig();
  const history = getHistory();
  return {
    success: true,
    phase: "24.2-autonomous-scheduler-cron-control",
    config,
    due: isDue(),
    cronPlan: buildCronPlan(),
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  buildCronPlan,
  isDue,
  evaluateAndRun,
  getSchedulerCenter
};
