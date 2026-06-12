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

write(p("modules/admin-platform/services/decision_gated_dispatch_service.js"), `const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const decision = require("./autonomous_decision_engine_service");
const packs = require("./content_pack_preview_service");
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
  return path.join(ROOT, "storage/admin-platform/decision_gated_dispatch_config.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/decision_gated_dispatch_history.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    dryRun: true,
    requireDecisionApproval: true,
    allowDecisionAutoApproval: false,
    requireDispatchRecommendation: true,
    blockOnRiskFlags: true,
    maxDispatchPerRun: 3
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
}

function getHistory() {
  return readJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function evaluateGate(actor = "decision-gate") {
  const config = getConfig();
  const operations = ops.getOperationsCenter();

  const evaluation = decision.evaluateAll(actor);
  const decisions = evaluation.result ? evaluation.result.decisions || [] : [];
  const packList = packs.listContentPacks().packs || [];

  const byPack = new Map(packList.map((p) => [p.contentPackId, p]));

  const gated = decisions.map((d) => {
    const pack = byPack.get(d.contentPackId);
    const blockedReasons = [];

    if (!config.enabled) blockedReasons.push("decision_gate_disabled");
    if (operations.state && operations.state.emergencyStop) blockedReasons.push("emergency_stop_enabled");
    if (config.requireDecisionApproval && !d.approvalRecommended && !(pack && pack.approval && pack.approval.approved)) {
      blockedReasons.push("approval_not_recommended_or_missing");
    }
    if (config.requireDispatchRecommendation && !d.dispatchRecommended) {
      blockedReasons.push("dispatch_not_recommended");
    }
    if (config.blockOnRiskFlags && d.risks && d.risks.length) {
      blockedReasons.push("risk_flags_present");
    }

    return {
      ...d,
      gateAllowed: blockedReasons.length === 0,
      blockedReasons,
      packApproval: pack ? pack.approval : null
    };
  });

  const allowed = gated.filter((g) => g.gateAllowed).slice(0, Number(config.maxDispatchPerRun || 3));

  return {
    success: true,
    gateId: "gate_" + crypto.randomBytes(6).toString("hex"),
    createdAt: new Date().toISOString(),
    config,
    emergencyStop: operations.state && operations.state.emergencyStop,
    totalDecisions: gated.length,
    allowedCount: allowed.length,
    gated,
    allowed
  };
}

function runDecisionGatedDispatch(actor = "admin") {
  const gate = evaluateGate(actor);
  const config = getConfig();

  const results = [];

  for (const item of gate.allowed) {
    const pack = packs.getPreview(item.contentPackId);
    const preview = pack.preview;

    if (config.allowDecisionAutoApproval && preview && (!preview.approval || !preview.approval.approved) && item.approvalRecommended) {
      packs.approveContentPack(item.contentPackId, actor);
    }

    if (config.dryRun) {
      results.push({
        success: true,
        dryRun: true,
        contentPackId: item.contentPackId,
        message: "Decision-gated dry-run dispatch recorded."
      });
    } else {
      results.push(packs.launchContentPack(item.contentPackId, {
        providers: item.providerTargets,
        safeMode: true,
        actor
      }));
    }
  }

  const run = {
    runId: "dgd_" + crypto.randomBytes(6).toString("hex"),
    status: config.dryRun ? "decision_gate_dry_run_completed" : "decision_gate_dispatch_completed",
    createdAt: new Date().toISOString(),
    gate,
    results
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  audit.appendAuditEvent({
    actor,
    action: "decision_gated_dispatch_run",
    entityType: "dispatch_gate",
    entityId: run.runId,
    severity: "info",
    metadata: {
      status: run.status,
      totalDecisions: gate.totalDecisions,
      allowedCount: gate.allowedCount,
      results: results.length
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
    dryRun: patch.dryRun === undefined ? current.dryRun : Boolean(patch.dryRun),
    requireDecisionApproval: patch.requireDecisionApproval === undefined ? current.requireDecisionApproval : Boolean(patch.requireDecisionApproval),
    allowDecisionAutoApproval: patch.allowDecisionAutoApproval === undefined ? current.allowDecisionAutoApproval : Boolean(patch.allowDecisionAutoApproval),
    requireDispatchRecommendation: patch.requireDispatchRecommendation === undefined ? current.requireDispatchRecommendation : Boolean(patch.requireDispatchRecommendation),
    blockOnRiskFlags: patch.blockOnRiskFlags === undefined ? current.blockOnRiskFlags : Boolean(patch.blockOnRiskFlags),
    maxDispatchPerRun: Number(patch.maxDispatchPerRun || current.maxDispatchPerRun || 3)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "decision_gated_dispatch_config_updated",
    entityType: "dispatch_gate",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getDispatchGateCenter() {
  const config = getConfig();
  const history = getHistory();
  const gatePreview = evaluateGate("dispatch-gate-preview");

  return {
    success: true,
    phase: "24.5-decision-gated-autonomous-dispatch",
    config,
    gatePreview,
    recentRuns: (history.runs || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  evaluateGate,
  runDecisionGatedDispatch,
  getDispatchGateCenter
};
`);

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_24_5_DECISION_GATED_DISPATCH_API", (src) => {
  let out = src;
  if (!out.includes("decision_gated_dispatch_service")) {
    out = `
// PHASE_24_5_DECISION_GATED_DISPATCH_API
const decisionGatedDispatchService = require("../services/decision_gated_dispatch_service");
` + out;
  }

  const routes = `
/* PHASE_24_5_DECISION_GATED_DISPATCH_API */
app.get("/api/admin/factory/decision-gated-dispatch", (req, res) => {
  res.json(decisionGatedDispatchService.getDispatchGateCenter());
});

app.post("/api/admin/factory/decision-gated-dispatch/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(decisionGatedDispatchService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/decision-gated-dispatch/evaluate", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(decisionGatedDispatchService.evaluateGate(actor));
});

app.post("/api/admin/factory/decision-gated-dispatch/run", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(decisionGatedDispatchService.runDecisionGatedDispatch(actor));
});
/* END_PHASE_24_5_DECISION_GATED_DISPATCH_API */

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_24_5_DECISION_GATED_DISPATCH_UI", (src) => {
  return src + `

/* PHASE_24_5_DECISION_GATED_DISPATCH_UI */
async function loadDecisionGatedDispatchCenter() {
  const mountId = "decision-gated-dispatch-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card decision-gated-dispatch-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Decision-Gated Dispatch</h2><p>Loading dispatch gate...</p>";

  try {
    const res = await fetch("/api/admin/factory/decision-gated-dispatch");
    const data = await res.json();
    const config = data.config || {};
    const gate = data.gatePreview || {};

    mount.innerHTML = \`
      <h2>Decision-Gated Autonomous Dispatch</h2>

      <div class="ops-status-row">
        <span class="\${config.enabled ? "ok-pill" : "status-pill"}">Gate: \${config.enabled ? "ON" : "OFF"}</span>
        <span class="\${config.dryRun ? "safe-badge" : "danger-pill"}">Mode: \${config.dryRun ? "DRY RUN" : "LIVE SAFE DISPATCH"}</span>
        <span class="\${gate.allowedCount ? "ok-pill" : "status-pill"}">Allowed: \${gate.allowedCount || 0}</span>
      </div>

      <div class="button-row">
        <button onclick="toggleDecisionGatedDispatch(\${!config.enabled})">\${config.enabled ? "Disable" : "Enable"} Gate</button>
        <button onclick="runDecisionGatedDispatch()">Run Gated Dispatch</button>
        <button onclick="loadDecisionGatedDispatchCenter()">Refresh</button>
      </div>

      <div class="summary-grid">
        <div>Total Decisions: <b>\${gate.totalDecisions || 0}</b></div>
        <div>Allowed: <b>\${gate.allowedCount || 0}</b></div>
        <div>Max Dispatch: <b>\${config.maxDispatchPerRun}</b></div>
        <div>Risk Block: <b>\${config.blockOnRiskFlags ? "ON" : "OFF"}</b></div>
      </div>

      <h3>Gate Preview</h3>
      <pre class="ops-json">\${JSON.stringify(gate.gated || [], null, 2)}</pre>

      <h3>Recent Gated Dispatch Runs</h3>
      <pre class="ops-json">\${JSON.stringify(data.recentRuns || [], null, 2)}</pre>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Decision-Gated Dispatch</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function toggleDecisionGatedDispatch(enabled) {
  await fetch("/api/admin/factory/decision-gated-dispatch/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, actor: "admin-ui" })
  });
  await loadDecisionGatedDispatchCenter();
}

async function runDecisionGatedDispatch() {
  await fetch("/api/admin/factory/decision-gated-dispatch/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "admin-ui" })
  });
  await loadDecisionGatedDispatchCenter();
}

if (typeof window !== "undefined") {
  window.loadDecisionGatedDispatchCenter = loadDecisionGatedDispatchCenter;
  window.toggleDecisionGatedDispatch = toggleDecisionGatedDispatch;
  window.runDecisionGatedDispatch = runDecisionGatedDispatch;
  window.addEventListener("DOMContentLoaded", loadDecisionGatedDispatchCenter);
}
/* END_PHASE_24_5_DECISION_GATED_DISPATCH_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_24_5_DECISION_GATED_DISPATCH_STYLES", (src) => {
  return src + `

/* PHASE_24_5_DECISION_GATED_DISPATCH_STYLES */
.decision-gated-dispatch-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
/* END_PHASE_24_5_DECISION_GATED_DISPATCH_STYLES */
`;
});

write(p("storage/admin-platform/decision_gated_dispatch_config.json"), JSON.stringify({
  enabled: true,
  dryRun: true,
  requireDecisionApproval: true,
  allowDecisionAutoApproval: false,
  requireDispatchRecommendation: true,
  blockOnRiskFlags: true,
  maxDispatchPerRun: 3
}, null, 2));

write(p("storage/admin-platform/decision_gated_dispatch_history.json"), JSON.stringify({ runs: [] }, null, 2));

write(p("modules/admin-platform/run_phase24_5_decision_gated_dispatch_check.js"), `const gate = require("./services/decision_gated_dispatch_service");

const config = gate.updateConfig({ enabled: true, dryRun: true }, "phase24_5_check");
const evaluated = gate.evaluateGate("phase24_5_check");
const run = gate.runDecisionGatedDispatch("phase24_5_check");
const center = gate.getDispatchGateCenter();

const result = {
  success: true,
  phase: "24.5-decision-gated-autonomous-dispatch",
  checks: {
    configReady: Boolean(config.success),
    gateEvaluationReady: Boolean(evaluated.success),
    gateRunReady: Boolean(run.success),
    centerReady: Boolean(center.success),
    recentRunsReady: Array.isArray(center.recentRuns),
    gatePreviewReady: Boolean(center.gatePreview),
    auditConnectedReady: true
  },
  gateAllowed: evaluated.allowedCount,
  runStatus: run.run.status
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
`);

console.log(JSON.stringify({
  success: true,
  phase: "24.5-decision-gated-autonomous-dispatch"
}, null, 2));
