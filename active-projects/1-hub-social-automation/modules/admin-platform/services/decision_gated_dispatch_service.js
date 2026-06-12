const fs = require("fs");
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
