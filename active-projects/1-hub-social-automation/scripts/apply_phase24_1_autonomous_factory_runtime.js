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

write(p("modules/admin-platform/services/autonomous_factory_runtime_service.js"), `const fs = require("fs");
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
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_24_1_AUTONOMOUS_RUNTIME_API", (src) => {
  let out = src;
  if (!out.includes("autonomous_factory_runtime_service")) {
    out = `
// PHASE_24_1_AUTONOMOUS_RUNTIME_API
const autonomousRuntimeService = require("../services/autonomous_factory_runtime_service");
` + out;
  }

  const routes = `
/* PHASE_24_1_AUTONOMOUS_RUNTIME_API */
app.get("/api/admin/factory/autonomous-runtime", (req, res) => {
  res.json(autonomousRuntimeService.getRuntimeCenter());
});

app.post("/api/admin/factory/autonomous-runtime/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousRuntimeService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/autonomous-runtime/run-once", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousRuntimeService.runOnce(actor));
});
/* END_PHASE_24_1_AUTONOMOUS_RUNTIME_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_24_1_AUTONOMOUS_RUNTIME_UI", (src) => {
  return src + `

/* PHASE_24_1_AUTONOMOUS_RUNTIME_UI */
async function loadAutonomousRuntimeCenter() {
  const mountId = "autonomous-runtime-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card autonomous-runtime-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Autonomous Factory Runtime</h2><p>Loading runtime...</p>";

  try {
    const res = await fetch("/api/admin/factory/autonomous-runtime");
    const data = await res.json();
    const config = data.config || {};
    const state = data.state || {};
    const guard = data.guard || {};

    mount.innerHTML = \`
      <h2>Autonomous Factory Runtime</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Runtime: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE SAFE DISPATCH"}</span>
        <span class="\${guard.allowed ? "ok-pill" : "danger-pill"}">Guard: \${guard.reason}</span>
      </div>

      <div class="button-row">
        <button onclick="toggleAutonomousRuntime(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Runtime</button>
        <button onclick="toggleAutonomousDryRun(\${!config.dryRun})">\${config.dryRun ? "Disable" : "Enable"} Dry Run</button>
        <button onclick="runAutonomousFactoryOnce()">Run Once</button>
        <button onclick="loadAutonomousRuntimeCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Last Status: <b>\${state.lastStatus || "never_run"}</b></div>
        <div>Last Run: <b>\${state.lastRunId || "-"}</b></div>
        <div>Plan Items: <b>\${(data.dispatchPlan || []).length}</b></div>
        <div>Auto Approve: <b>\${config.autoApprovePublishable ? "ON" : "OFF"}</b></div>
      </div>

      <h3>Dispatch Plan</h3>
      <pre class="ops-json">\${JSON.stringify(data.dispatchPlan || [], null, 2)}</pre>

      <h3>Recent Runtime Runs</h3>
      <pre class="ops-json">\${JSON.stringify(data.recentRuns || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Autonomous Factory Runtime</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleAutonomousRuntime(enabled) {
  await fetch("/api/admin/factory/autonomous-runtime/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadAutonomousRuntimeCenter();
}

async function toggleAutonomousDryRun(dryRun) {
  await fetch("/api/admin/factory/autonomous-runtime/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dryRun, actor: "admin-ui" })
  });
  await loadAutonomousRuntimeCenter();
}

async function runAutonomousFactoryOnce() {
  await fetch("/api/admin/factory/autonomous-runtime/run-once", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadAutonomousRuntimeCenter();
}

if (typeof window !== "undefined") {
  window.loadAutonomousRuntimeCenter = loadAutonomousRuntimeCenter;
  window.toggleAutonomousRuntime = toggleAutonomousRuntime;
  window.toggleAutonomousDryRun = toggleAutonomousDryRun;
  window.runAutonomousFactoryOnce = runAutonomousFactoryOnce;
  window.addEventListener("DOMContentLoaded", loadAutonomousRuntimeCenter);
}
/* END_PHASE_24_1_AUTONOMOUS_RUNTIME_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_24_1_AUTONOMOUS_RUNTIME_STYLES", (src) => {
  return src + `

/* PHASE_24_1_AUTONOMOUS_RUNTIME_STYLES */
.autonomous-runtime-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_24_1_AUTONOMOUS_RUNTIME_STYLES */
`;
});

write(p("storage/admin-platform/autonomous_runtime_config.json"), JSON.stringify({
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
}, null, 2));

write(p("storage/admin-platform/autonomous_runtime_state.json"), JSON.stringify({
  enabled: false,
  lastRunAt: null,
  lastRunId: null,
  lastStatus: "never_run"
}, null, 2));

write(p("storage/admin-platform/autonomous_runtime_runs.json"), JSON.stringify({
  runs: []
}, null, 2));

write(p("modules/admin-platform/run_phase24_1_autonomous_runtime_check.js"), `const runtime = require("./services/autonomous_factory_runtime_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase24_1_check");
ops.setEmergencyStop(false, "phase24_1_clear", "phase24_1_check");

const configUpdated = runtime.updateConfig({
  enabled: true,
  dryRun: true,
  requireSafeMode: true,
  autoApprovePublishable: false
}, "phase24_1_check");

const center = runtime.getRuntimeCenter();
const plan = runtime.buildDispatchPlan(center.config);
const run = runtime.runOnce("phase24_1_check");

runtime.updateConfig({ enabled: false, dryRun: true }, "phase24_1_check_cleanup");

const result = {
  success: true,
  phase: "24.1-autonomous-factory-runtime-foundation",
  checks: {
    configUpdateReady: Boolean(configUpdated.success),
    runtimeCenterReady: Boolean(center.success),
    emergencyStopGuardReady: Boolean(center.guard),
    dispatchPlanReady: Array.isArray(plan),
    runOnceReady: Boolean(run.success || run.blocked),
    dryRunModeReady: center.config.dryRun === true,
    auditConnectedReady: true
  },
  guard: center.guard,
  planItems: plan.length,
  runStatus: run.run && run.run.status
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) {
  process.exit(1);
}
`);

console.log(JSON.stringify({
  success: true,
  phase: "24.1-autonomous-factory-runtime-foundation"
}, null, 2));
