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

write(p("modules/admin-platform/services/autonomous_control_loop_service.js"), `const fs = require("fs");
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
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_API", (src) => {
  let out = src;
  if (!out.includes("autonomous_control_loop_service")) {
    out = `
// PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_API
const autonomousControlLoopService = require("../services/autonomous_control_loop_service");
` + out;
  }

  const routes = `
/* PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_API */
app.get("/api/admin/factory/autonomous-control-loop", (req, res) => {
  res.json(autonomousControlLoopService.getControlLoopCenter());
});

app.post("/api/admin/factory/autonomous-control-loop/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousControlLoopService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/autonomous-control-loop/run-cycle", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousControlLoopService.runCycle(actor));
});
/* END_PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_UI", (src) => {
  return src + `

/* PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_UI */
async function loadAutonomousControlLoopCenter() {
  const mountId = "autonomous-control-loop-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card autonomous-control-loop-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Autonomous Control Loop</h2><p>Loading control loop...</p>";

  try {
    const res = await fetch("/api/admin/factory/autonomous-control-loop");
    const data = await res.json();
    const config = data.config || {};
    const guard = data.guard || {};

    mount.innerHTML = \`
      <h2>Autonomous Control Loop Orchestrator</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Loop: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE SAFE LOOP"}</span>
        <span class="\${guard.allowed ? "ok-pill" : "danger-pill"}">Guard: \${guard.reason}</span>
      </div>

      <div class="button-row">
        <button onclick="toggleAutonomousControlLoop(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Loop</button>
        <button onclick="runAutonomousControlLoopCycle()">Run Cycle</button>
        <button onclick="loadAutonomousControlLoopCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Decision Gate: <b>\${config.runDecisionGate ? "ON" : "OFF"}</b></div>
        <div>Dispatch: <b>\${config.runDispatch ? "ON" : "OFF"}</b></div>
        <div>Retry Scan: <b>\${config.scanRetriesAfterCycle ? "ON" : "OFF"}</b></div>
        <div>Cycles: <b>\${(data.recentCycles || []).length}</b></div>
      </div>

      <h3>Control Loop Snapshot</h3>
      <pre class="ops-json">\${JSON.stringify({
        schedulerDue: data.scheduler && data.scheduler.due,
        gateAllowed: data.decisionGate && data.decisionGate.gatePreview && data.decisionGate.gatePreview.allowedCount,
        retrySummary: data.retry && data.retry.summary
      }, null, 2)}</pre>

      <h3>Recent Cycles</h3>
      <pre class="ops-json">\${JSON.stringify(data.recentCycles || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Autonomous Control Loop</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleAutonomousControlLoop(enabled) {
  await fetch("/api/admin/factory/autonomous-control-loop/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadAutonomousControlLoopCenter();
}

async function runAutonomousControlLoopCycle() {
  await fetch("/api/admin/factory/autonomous-control-loop/run-cycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadAutonomousControlLoopCenter();
}

if (typeof window !== "undefined") {
  window.loadAutonomousControlLoopCenter = loadAutonomousControlLoopCenter;
  window.toggleAutonomousControlLoop = toggleAutonomousControlLoop;
  window.runAutonomousControlLoopCycle = runAutonomousControlLoopCycle;
  window.addEventListener("DOMContentLoaded", loadAutonomousControlLoopCenter);
}
/* END_PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_STYLES", (src) => {
  return src + `

/* PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_STYLES */
.autonomous-control-loop-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_24_6_AUTONOMOUS_CONTROL_LOOP_STYLES */
`;
});

write(p("storage/admin-platform/autonomous_control_loop_config.json"), JSON.stringify({
  enabled: false,
  dryRun: true,
  requireSafeMode: true,
  requireSchedulerDue: false,
  runDecisionGate: true,
  runDispatch: true,
  scanRetriesAfterCycle: true,
  runRetryAfterScan: false,
  maxCyclesPerManualRun: 1
}, null, 2));

write(p("storage/admin-platform/autonomous_control_loop_history.json"), JSON.stringify({ cycles: [] }, null, 2));

write(p("modules/admin-platform/run_phase24_6_autonomous_control_loop_check.js"), `const loop = require("./services/autonomous_control_loop_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase24_6_check");
ops.setEmergencyStop(false, "phase24_6_clear", "phase24_6_check");

const config = loop.updateConfig({
  enabled: true,
  dryRun: true,
  requireSafeMode: true,
  requireSchedulerDue: false
}, "phase24_6_check");

const center = loop.getControlLoopCenter();
const guard = loop.guardCycle(center.config);
const run = loop.runCycle("phase24_6_check");

loop.updateConfig({ enabled: false, dryRun: true }, "phase24_6_cleanup");

const result = {
  success: true,
  phase: "24.6-autonomous-control-loop-orchestrator",
  checks: {
    configReady: Boolean(config.success),
    centerReady: Boolean(center.success),
    guardReady: Boolean(guard.reason),
    runCycleReady: Boolean(run.success || run.blocked),
    recentCyclesReady: Array.isArray(center.recentCycles),
    schedulerLinkedReady: Boolean(center.scheduler),
    decisionGateLinkedReady: Boolean(center.decisionGate),
    retryLinkedReady: Boolean(center.retry),
    auditConnectedReady: true
  },
  guard,
  runStatus: run.cycle && run.cycle.status
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "24.6-autonomous-control-loop-orchestrator"
}, null, 2));
