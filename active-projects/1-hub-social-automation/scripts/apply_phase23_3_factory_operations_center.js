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
function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(filePath, data) {
  write(filePath, JSON.stringify(data, null, 2));
}
function patchOnce(filePath, marker, patcher) {
  const src = read(filePath);
  if (src.includes(marker)) return false;
  write(filePath, patcher(src));
  return true;
}

write(p("modules/admin-platform/services/factory_operations_service.js"), `const fs = require("fs");
const path = require("path");

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

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function statFile(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return null;
  const s = fs.statSync(abs);
  return {
    file,
    sizeBytes: s.size,
    updatedAt: s.mtime.toISOString()
  };
}

function operationsFile() {
  return path.join(ROOT, "storage/admin-platform/factory_operations_state.json");
}

function emergencyFile() {
  return path.join(ROOT, "storage/admin-platform/factory_emergency_stop.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/factory_operations_history.json");
}

function getOpsState() {
  return readJson(operationsFile(), {
    safeMode: true,
    emergencyStop: false,
    updatedAt: null,
    notes: []
  });
}

function saveOpsState(state) {
  state.updatedAt = new Date().toISOString();
  writeJson(operationsFile(), state);
}

function addHistory(event) {
  const history = readJson(historyFile(), { events: [] });
  history.events.push({
    ...event,
    createdAt: new Date().toISOString()
  });
  writeJson(historyFile(), history);
}

function getProviderHealth() {
  const files = [
    "modules/providers/output/provider_health_status.json",
    "modules/providers/output/provider_summary.json",
    "storage/publishing/provider_health.json"
  ];

  return files.map((file) => ({
    source: file,
    exists: exists(file),
    stat: statFile(file),
    data: readJson(path.join(ROOT, file), null)
  }));
}

function getChannelHealth() {
  const active = readJson(path.join(ROOT, "modules/channels/storage/active_channel.json"), null);
  const registry = readJson(path.join(ROOT, "modules/channels/storage/channels.json"), []);
  return {
    activeChannel: active,
    totalChannels: Array.isArray(registry) ? registry.length : Object.keys(registry || {}).length,
    registryExists: exists("modules/channels/storage/channels.json")
  };
}

function getQueueMonitor() {
  const candidates = [
    "storage/jobs/job_queue.json",
    "storage/publishing/publishing_queue.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ];

  return candidates.map((file) => ({
    source: file,
    exists: exists(file),
    stat: statFile(file),
    data: readJson(path.join(ROOT, file), null)
  }));
}

function getPublishingMonitor() {
  const files = [
    "storage/publishing/publish_history.json",
    "storage/publishing/publishing_queue.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ];

  return files.map((file) => ({
    source: file,
    exists: exists(file),
    stat: statFile(file),
    data: readJson(path.join(ROOT, file), null)
  }));
}

function getRecentRuns() {
  const sources = [
    readJson(path.join(ROOT, "storage/admin-platform/content_pack_launch_history.json"), { runs: [] }).runs || [],
    readJson(path.join(ROOT, "storage/admin-platform/factory_operations_history.json"), { events: [] }).events || [],
    readJson(path.join(ROOT, "storage/pipeline/pipeline_run_history.json"), { runs: [] }).runs || []
  ];

  return sources.flat()
    .sort((a, b) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")))
    .slice(0, 20);
}

function getFailureDiagnostics() {
  const watched = [
    "storage/pipeline/latest_pipeline_report.json",
    "modules/video-renderer/output/batch_render_report.json",
    "modules/content-packs/output/content_pack_registry_check.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ];

  return watched.map((file) => {
    const data = readJson(path.join(ROOT, file), null);
    const raw = JSON.stringify(data || {});
    return {
      source: file,
      exists: exists(file),
      hasFailureSignal: /false|error|failed|fail/i.test(raw),
      stat: statFile(file)
    };
  });
}

function getMetrics() {
  const providerHealth = getProviderHealth();
  const queue = getQueueMonitor();
  const publishing = getPublishingMonitor();
  const failures = getFailureDiagnostics();

  return {
    providerSourcesOnline: providerHealth.filter((x) => x.exists).length,
    queueSourcesOnline: queue.filter((x) => x.exists).length,
    publishingSourcesOnline: publishing.filter((x) => x.exists).length,
    failureSignals: failures.filter((x) => x.hasFailureSignal).length,
    recentRuns: getRecentRuns().length
  };
}

function getOperationsCenter() {
  const state = getOpsState();
  const emergency = readJson(emergencyFile(), { enabled: false, reason: null, updatedAt: null });

  return {
    success: true,
    phase: "23.3-factory-operations-center",
    state: {
      ...state,
      emergencyStop: Boolean(emergency.enabled)
    },
    metrics: getMetrics(),
    monitors: {
      providerHealth: getProviderHealth(),
      channelHealth: getChannelHealth(),
      queue: getQueueMonitor(),
      publishing: getPublishingMonitor()
    },
    recentRuns: getRecentRuns(),
    failureDiagnostics: getFailureDiagnostics(),
    recoveryActions: [
      { id: "refresh_status", label: "Refresh Factory Status", safe: true },
      { id: "resume_safe_mode", label: "Resume in Safe Mode", safe: true },
      { id: "clear_emergency_stop", label: "Clear Emergency Stop", safe: true },
      { id: "recheck_providers", label: "Recheck Providers", safe: true }
    ]
  };
}

function setSafeMode(enabled, actor = "admin") {
  const state = getOpsState();
  state.safeMode = Boolean(enabled);
  saveOpsState(state);
  addHistory({
    type: "safe_mode_changed",
    actor,
    enabled: state.safeMode
  });
  return { success: true, safeMode: state.safeMode };
}

function setEmergencyStop(enabled, reason = "", actor = "admin") {
  const emergency = {
    enabled: Boolean(enabled),
    reason,
    actor,
    updatedAt: new Date().toISOString()
  };
  writeJson(emergencyFile(), emergency);

  const state = getOpsState();
  state.emergencyStop = emergency.enabled;
  saveOpsState(state);

  addHistory({
    type: emergency.enabled ? "emergency_stop_enabled" : "emergency_stop_cleared",
    actor,
    reason
  });

  return { success: true, emergencyStop: emergency };
}

function runRecoveryAction(actionId, actor = "admin") {
  const valid = ["refresh_status", "resume_safe_mode", "clear_emergency_stop", "recheck_providers"];
  if (!valid.includes(actionId)) {
    return { success: false, error: "UNKNOWN_RECOVERY_ACTION", actionId };
  }

  if (actionId === "resume_safe_mode") setSafeMode(true, actor);
  if (actionId === "clear_emergency_stop") setEmergencyStop(false, "cleared_by_recovery_action", actor);

  addHistory({ type: "recovery_action", actor, actionId });

  return {
    success: true,
    actionId,
    operationsCenter: getOperationsCenter()
  };
}

module.exports = {
  getOperationsCenter,
  setSafeMode,
  setEmergencyStop,
  runRecoveryAction
};
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_23_3_FACTORY_OPERATIONS_API", (src) => {
  let out = src;
  if (!out.includes("factory_operations_service")) {
    out = `
// PHASE_23_3_FACTORY_OPERATIONS_API
const factoryOperationsService = require("../services/factory_operations_service");
` + out;
  }

  const routes = `
/* PHASE_23_3_FACTORY_OPERATIONS_API */
app.get("/api/admin/factory/operations", (req, res) => {
  res.json(factoryOperationsService.getOperationsCenter());
});

app.post("/api/admin/factory/safe-mode", (req, res) => {
  const enabled = Boolean(req.body && req.body.enabled);
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(factoryOperationsService.setSafeMode(enabled, actor));
});

app.post("/api/admin/factory/emergency-stop", (req, res) => {
  const enabled = Boolean(req.body && req.body.enabled);
  const reason = (req.body && req.body.reason) || "";
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(factoryOperationsService.setEmergencyStop(enabled, reason, actor));
});

app.post("/api/admin/factory/recovery-action", (req, res) => {
  const actionId = req.body && req.body.actionId;
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(factoryOperationsService.runRecoveryAction(actionId, actor));
});
/* END_PHASE_23_3_FACTORY_OPERATIONS_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_23_3_FACTORY_OPERATIONS_UI", (src) => {
  return src + `

/* PHASE_23_3_FACTORY_OPERATIONS_UI */
async function loadFactoryOperationsCenter() {
  const mountId = "factory-operations-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card factory-operations-center";
    document.body.insertBefore(mount, document.body.firstChild);
  }

  mount.innerHTML = "<h2>Factory Operations Center</h2><p>Loading factory status...</p>";

  try {
    const res = await fetch("/api/admin/factory/operations");
    const data = await res.json();

    const state = data.state || {};
    const metrics = data.metrics || {};
    const emergencyClass = state.emergencyStop ? "danger-pill" : "ok-pill";
    const safeClass = state.safeMode ? "safe-badge" : "status-pill";

    mount.innerHTML = \`
      <h2>Factory Operations Center</h2>

      <div class="ops-status-row">
        <span class="\${safeClass}">Safe Mode: \${state.safeMode ? "ON" : "OFF"}</span>
        <span class="\${emergencyClass}">Emergency Stop: \${state.emergencyStop ? "ON" : "OFF"}</span>
        <button onclick="toggleFactorySafeMode(\${!state.safeMode})">\${state.safeMode ? "Disable" : "Enable"} Safe Mode</button>
        <button onclick="toggleFactoryEmergencyStop(\${!state.emergencyStop})">\${state.emergencyStop ? "Clear" : "Enable"} Emergency Stop</button>
      </div>

      <div class="summary-grid">
        <div>Provider Sources: <b>\${metrics.providerSourcesOnline || 0}</b></div>
        <div>Queue Sources: <b>\${metrics.queueSourcesOnline || 0}</b></div>
        <div>Publishing Sources: <b>\${metrics.publishingSourcesOnline || 0}</b></div>
        <div>Failure Signals: <b>\${metrics.failureSignals || 0}</b></div>
      </div>

      <h3>Monitors</h3>
      <div class="ops-monitor-grid">
        \${renderOpsMonitor("Provider Health", data.monitors.providerHealth)}
        \${renderOpsMonitor("Queue Monitor", data.monitors.queue)}
        \${renderOpsMonitor("Publishing Monitor", data.monitors.publishing)}
      </div>

      <h3>Channel Health</h3>
      <pre class="ops-json">\${JSON.stringify(data.monitors.channelHealth || {}, null, 2)}</pre>

      <h3>Failure Diagnostics</h3>
      <div class="content-pack-list">
        \${(data.failureDiagnostics || []).map(d => \`
          <div class="mini-run-card">
            <b>\${d.source}</b>
            <span class="\${d.hasFailureSignal ? "danger-pill" : "ok-pill"}">\${d.hasFailureSignal ? "Signal Found" : "OK"}</span>
          </div>
        \`).join("")}
      </div>

      <h3>Recovery Actions</h3>
      <div class="button-row">
        \${(data.recoveryActions || []).map(a => \`<button onclick="runFactoryRecoveryAction('\${a.id}')">\${a.label}</button>\`).join("")}
      </div>

      <h3>Recent Runs Feed</h3>
      <pre class="ops-json">\${JSON.stringify(data.recentRuns || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Factory Operations Center</h2><p class='danger'>" + err.message + "</p>";
  }
}

function renderOpsMonitor(title, rows) {
  return \`
    <div class="ops-monitor-card">
      <h4>\${title}</h4>
      \${(rows || []).map(row => \`
        <div class="mini-run-card">
          <span>\${row.source}</span>
          <span class="\${row.exists ? "ok-pill" : "status-pill"}">\${row.exists ? "Online" : "Missing"}</span>
        </div>
      \`).join("")}
    </div>
  \`;
}

async function toggleFactorySafeMode(enabled) {
  await fetch("/api/admin/factory/safe-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadFactoryOperationsCenter();
}

async function toggleFactoryEmergencyStop(enabled) {
  await fetch("/api/admin/factory/emergency-stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, reason: enabled ? "manual_admin_ui_stop" : "manual_admin_ui_clear", actor: "admin-ui" })
  });
  await loadFactoryOperationsCenter();
}

async function runFactoryRecoveryAction(actionId) {
  await fetch("/api/admin/factory/recovery-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actionId, actor: "admin-ui" })
  });
  await loadFactoryOperationsCenter();
}

if (typeof window !== "undefined") {
  window.loadFactoryOperationsCenter = loadFactoryOperationsCenter;
  window.toggleFactorySafeMode = toggleFactorySafeMode;
  window.toggleFactoryEmergencyStop = toggleFactoryEmergencyStop;
  window.runFactoryRecoveryAction = runFactoryRecoveryAction;
  window.addEventListener("DOMContentLoaded", loadFactoryOperationsCenter);
}
/* END_PHASE_23_3_FACTORY_OPERATIONS_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_23_3_FACTORY_OPERATIONS_STYLES", (src) => {
  return src + `

/* PHASE_23_3_FACTORY_OPERATIONS_STYLES */
.factory-operations-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
.ops-status-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 12px 0 18px; }
.ops-monitor-grid { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 14px; }
.ops-monitor-card { border: 1px solid #ddd; border-radius: 14px; padding: 12px; }
.mini-run-card { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px; border-bottom: 1px solid rgba(160,160,160,.25); }
.ok-pill, .danger-pill { display: inline-block; padding: 4px 8px; border-radius: 999px; border: 1px solid #bbb; font-size: 12px; }
.ok-pill { font-weight: 700; }
.danger-pill { font-weight: 700; color: #c0392b; }
.ops-json { max-height: 320px; overflow: auto; padding: 12px; border-radius: 12px; background: #111; color: #eee; }
/* END_PHASE_23_3_FACTORY_OPERATIONS_STYLES */
`;
});

writeJson(p("storage/admin-platform/factory_operations_state.json"), {
  safeMode: true,
  emergencyStop: false,
  updatedAt: null,
  notes: ["Phase 23.3 operations center initialized in safe mode."]
});

writeJson(p("storage/admin-platform/factory_emergency_stop.json"), {
  enabled: false,
  reason: null,
  updatedAt: null
});

writeJson(p("storage/admin-platform/factory_operations_history.json"), {
  events: []
});

write(p("modules/admin-platform/run_phase23_3_factory_operations_check.js"), `const ops = require("./services/factory_operations_service");

const center = ops.getOperationsCenter();
const safeOn = ops.setSafeMode(true, "phase23_3_check");
const emergencyOn = ops.setEmergencyStop(true, "phase23_3_test", "phase23_3_check");
const emergencyOff = ops.setEmergencyStop(false, "phase23_3_test_clear", "phase23_3_check");
const recovery = ops.runRecoveryAction("refresh_status", "phase23_3_check");

const result = {
  success: true,
  phase: "23.3-factory-operations-center",
  checks: {
    operationsCenterLoaded: Boolean(center.success),
    metricsReady: Boolean(center.metrics),
    monitorsReady: Boolean(center.monitors),
    providerHealthMonitorReady: Array.isArray(center.monitors.providerHealth),
    queueMonitorReady: Array.isArray(center.monitors.queue),
    publishingMonitorReady: Array.isArray(center.monitors.publishing),
    channelHealthReady: Boolean(center.monitors.channelHealth),
    recentRunsReady: Array.isArray(center.recentRuns),
    failureDiagnosticsReady: Array.isArray(center.failureDiagnostics),
    safeModeControlsReady: Boolean(safeOn.success),
    emergencyStopControlsReady: Boolean(emergencyOn.success && emergencyOff.success),
    recoveryActionsReady: Boolean(recovery.success)
  },
  summary: center.metrics
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) {
  process.exit(1);
}
`);

console.log(JSON.stringify({
  success: true,
  phase: "23.3-factory-operations-center",
  files: [
    "modules/admin-platform/services/factory_operations_service.js",
    "modules/admin-platform/api/admin_api_server.js",
    "modules/admin-platform/ui/app.js",
    "modules/admin-platform/ui/style.css",
    "modules/admin-platform/run_phase23_3_factory_operations_check.js",
    "storage/admin-platform/factory_operations_state.json",
    "storage/admin-platform/factory_emergency_stop.json",
    "storage/admin-platform/factory_operations_history.json"
  ]
}, null, 2));
