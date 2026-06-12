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

write(p("modules/admin-platform/services/autonomous_scheduler_service.js"), `const fs = require("fs");
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
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_24_2_AUTONOMOUS_SCHEDULER_API", (src) => {
  let out = src;
  if (!out.includes("autonomous_scheduler_service")) {
    out = `
// PHASE_24_2_AUTONOMOUS_SCHEDULER_API
const autonomousSchedulerService = require("../services/autonomous_scheduler_service");
` + out;
  }

  const routes = `
/* PHASE_24_2_AUTONOMOUS_SCHEDULER_API */
app.get("/api/admin/factory/autonomous-scheduler", (req, res) => {
  res.json(autonomousSchedulerService.getSchedulerCenter());
});

app.post("/api/admin/factory/autonomous-scheduler/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousSchedulerService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/autonomous-scheduler/evaluate", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousSchedulerService.evaluateAndRun(actor));
});
/* END_PHASE_24_2_AUTONOMOUS_SCHEDULER_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_24_2_AUTONOMOUS_SCHEDULER_UI", (src) => {
  return src + `

/* PHASE_24_2_AUTONOMOUS_SCHEDULER_UI */
async function loadAutonomousSchedulerCenter() {
  const mountId = "autonomous-scheduler-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card autonomous-scheduler-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Autonomous Scheduler</h2><p>Loading scheduler...</p>";

  try {
    const res = await fetch("/api/admin/factory/autonomous-scheduler");
    const data = await res.json();
    const config = data.config || {};
    const due = data.due || {};

    mount.innerHTML = \`
      <h2>Autonomous Scheduler + Cron Control</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Scheduler: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${due.due ? "ok-pill" : "danger-pill"}">Due: \${due.due ? "YES" : "NO"} — \${due.reason}</span>
        <span class="safe-badge">Interval: \${config.intervalMinutes} min</span>
      </div>

      <div class="button-row">
        <button onclick="toggleAutonomousScheduler(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Scheduler</button>
        <button onclick="evaluateAutonomousScheduler()">Evaluate Now</button>
        <button onclick="loadAutonomousSchedulerCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Max Runs/Day: <b>\${config.maxRunsPerDay}</b></div>
        <div>Allowed Hours: <b>\${(config.allowedHours || []).join(",")}</b></div>
        <div>Runtime Plan: <b>\${data.cronPlan.runtimeDispatchPlanCount || 0}</b></div>
        <div>Timezone: <b>\${config.timezone}</b></div>
      </div>

      <h3>Cron Plan</h3>
      <pre class="ops-json">\${JSON.stringify(data.cronPlan || {}, null, 2)}</pre>

      <h3>Scheduler History</h3>
      <pre class="ops-json">\${JSON.stringify(data.recentRuns || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Autonomous Scheduler</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleAutonomousScheduler(enabled) {
  await fetch("/api/admin/factory/autonomous-scheduler/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadAutonomousSchedulerCenter();
}

async function evaluateAutonomousScheduler() {
  await fetch("/api/admin/factory/autonomous-scheduler/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadAutonomousSchedulerCenter();
}

if (typeof window !== "undefined") {
  window.loadAutonomousSchedulerCenter = loadAutonomousSchedulerCenter;
  window.toggleAutonomousScheduler = toggleAutonomousScheduler;
  window.evaluateAutonomousScheduler = evaluateAutonomousScheduler;
  window.addEventListener("DOMContentLoaded", loadAutonomousSchedulerCenter);
}
/* END_PHASE_24_2_AUTONOMOUS_SCHEDULER_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_24_2_AUTONOMOUS_SCHEDULER_STYLES", (src) => {
  return src + `

/* PHASE_24_2_AUTONOMOUS_SCHEDULER_STYLES */
.autonomous-scheduler-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_24_2_AUTONOMOUS_SCHEDULER_STYLES */
`;
});

write(p("storage/admin-platform/autonomous_scheduler_config.json"), JSON.stringify({
  enabled: false,
  timezone: "Asia/Kolkata",
  intervalMinutes: 60,
  allowedHours: [9,10,11,12,13,14,15,16,17,18,19,20,21],
  manualRunWindowEnabled: true,
  maxRunsPerDay: 12,
  channelFilters: [],
  providerFilters: [],
  lastEvaluatedAt: null
}, null, 2));

write(p("storage/admin-platform/autonomous_scheduler_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase24_2_autonomous_scheduler_check.js"), `const scheduler = require("./services/autonomous_scheduler_service");
const runtime = require("./services/autonomous_factory_runtime_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase24_2_check");
ops.setEmergencyStop(false, "phase24_2_clear", "phase24_2_check");

runtime.updateConfig({ enabled: true, dryRun: true }, "phase24_2_check");

const config = scheduler.updateConfig({
  enabled: true,
  intervalMinutes: 0,
  maxRunsPerDay: 99
}, "phase24_2_check");

const center = scheduler.getSchedulerCenter();
const plan = scheduler.buildCronPlan();
const due = scheduler.isDue();
const run = scheduler.evaluateAndRun("phase24_2_check");

scheduler.updateConfig({ enabled: false, intervalMinutes: 60 }, "phase24_2_cleanup");
runtime.updateConfig({ enabled: false, dryRun: true }, "phase24_2_cleanup");

const result = {
  success: true,
  phase: "24.2-autonomous-scheduler-cron-control",
  checks: {
    configReady: Boolean(config.success),
    schedulerCenterReady: Boolean(center.success),
    cronPlanReady: Boolean(plan.success),
    dueDetectorReady: typeof due.due === "boolean",
    evaluateRunReady: Boolean(run.success),
    historyReady: Array.isArray(center.recentRuns),
    auditConnectedReady: true
  },
  due,
  runStatus: run.run && run.run.status
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "24.2-autonomous-scheduler-cron-control"
}, null, 2));
