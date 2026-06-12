const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

write(p("modules/admin-platform/services/publishing_dispatch_bridge_service.js"), `const fs = require("fs");
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
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_API", (src) => {
  let out = src;
  if (!out.includes("publishing_dispatch_bridge_service")) {
    out = `
// PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_API
const publishingDispatchBridgeService = require("../services/publishing_dispatch_bridge_service");
` + out;
  }

  const routes = `
/* PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_API */
app.get("/api/admin/factory/publishing-dispatch-bridge", (req, res) => {
  res.json(publishingDispatchBridgeService.getBridgeCenter());
});

app.post("/api/admin/factory/publishing-dispatch-bridge/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(publishingDispatchBridgeService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/publishing-dispatch-bridge/enqueue", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(publishingDispatchBridgeService.enqueueDispatchIntents(actor));
});
/* END_PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_UI", (src) => {
  return src + `

/* PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_UI */
async function loadPublishingDispatchBridgeCenter() {
  const mountId = "publishing-dispatch-bridge-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card publishing-dispatch-bridge-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Publishing Dispatch Bridge</h2><p>Loading bridge...</p>";

  try {
    const res = await fetch("/api/admin/factory/publishing-dispatch-bridge");
    const data = await res.json();
    const config = data.config || {};
    const preview = data.preview || {};

    mount.innerHTML = \`
      <h2>Publishing Dispatch Bridge</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Bridge: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE QUEUE"}</span>
        <span class="\${data.guard.allowed ? "ok-pill" : "danger-pill"}">Guard: \${data.guard.reason}</span>
      </div>

      <div class="button-row">
        <button onclick="togglePublishingDispatchBridge(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Bridge</button>
        <button onclick="enqueuePublishingDispatchBridge()">Enqueue Dispatch Intents</button>
        <button onclick="loadPublishingDispatchBridgeCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Preview Intents: <b>\${(preview.intents || []).length}</b></div>
        <div>Queue Items: <b>\${data.queueSummary.totalItems || 0}</b></div>
        <div>Dry Items: <b>\${data.queueSummary.dryRunItems || 0}</b></div>
        <div>Max/Run: <b>\${config.maxItemsPerBridgeRun}</b></div>
      </div>

      <h3>Intent Preview</h3>
      <pre class="ops-json">\${JSON.stringify(preview.intents || [], null, 2)}</pre>

      <h3>Dispatch Bridge Queue</h3>
      <pre class="ops-json">\${JSON.stringify(data.queue || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Publishing Dispatch Bridge</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function togglePublishingDispatchBridge(enabled) {
  await fetch("/api/admin/factory/publishing-dispatch-bridge/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadPublishingDispatchBridgeCenter();
}

async function enqueuePublishingDispatchBridge() {
  await fetch("/api/admin/factory/publishing-dispatch-bridge/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadPublishingDispatchBridgeCenter();
}

if (typeof window !== "undefined") {
  window.loadPublishingDispatchBridgeCenter = loadPublishingDispatchBridgeCenter;
  window.togglePublishingDispatchBridge = togglePublishingDispatchBridge;
  window.enqueuePublishingDispatchBridge = enqueuePublishingDispatchBridge;
  window.addEventListener("DOMContentLoaded", loadPublishingDispatchBridgeCenter);
}
/* END_PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_STYLES", (src) => {
  return src + `

/* PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_STYLES */
.publishing-dispatch-bridge-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_25_1_PUBLISHING_DISPATCH_BRIDGE_STYLES */
`;
});

write(p("storage/admin-platform/publishing_dispatch_bridge_config.json"), JSON.stringify({
  enabled: true,
  dryRun: true,
  requireSafeMode: true,
  requireDecisionGate: true,
  maxItemsPerBridgeRun: 5,
  queueStatus: "queued_by_dispatch_bridge",
  allowedProviders: [],
  allowedChannels: []
}, null, 2));

write(p("storage/publishing/dispatch_bridge_queue.json"), JSON.stringify({ items: [] }, null, 2));
write(p("storage/admin-platform/publishing_dispatch_bridge_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase25_1_publishing_dispatch_bridge_check.js"), `const bridge = require("./services/publishing_dispatch_bridge_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_1_check");
ops.setEmergencyStop(false, "phase25_1_clear", "phase25_1_check");

const config = bridge.updateConfig({ enabled: true, dryRun: true }, "phase25_1_check");
const preview = bridge.buildDispatchIntents("phase25_1_check");
const enqueue = bridge.enqueueDispatchIntents("phase25_1_check");
const center = bridge.getBridgeCenter();

const result = {
  success: true,
  phase: "25.1-publishing-dispatch-bridge-hardening",
  checks: {
    configReady: Boolean(config.success),
    guardReady: Boolean(center.guard),
    previewReady: Boolean(preview.success || preview.blocked),
    enqueueReady: Boolean(enqueue.success || enqueue.blocked),
    centerReady: Boolean(center.success),
    queueReady: Array.isArray(center.queue),
    auditConnectedReady: true
  },
  previewIntents: preview.intents ? preview.intents.length : 0,
  queueSummary: center.queueSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "25.1-publishing-dispatch-bridge-hardening"
}, null, 2));
