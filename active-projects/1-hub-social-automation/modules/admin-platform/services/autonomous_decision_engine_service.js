const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const audit = require("./factory_audit_service");
const packs = require("./content_pack_preview_service");
const runtime = require("./autonomous_factory_runtime_service");
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
  return path.join(ROOT, "storage/admin-platform/autonomous_decision_config.json");
}

function decisionLogFile() {
  return path.join(ROOT, "storage/admin-platform/autonomous_decision_log.json");
}

function getConfig() {
  return readJson(configFile(), {
    enabled: true,
    minScoreForApproval: 70,
    minScoreForDispatch: 80,
    requirePublishable: true,
    requireAssets: false,
    requireProviders: true,
    requireChannel: true,
    safeModeOnly: true,
    riskBlockThreshold: 2,
    allowedProviders: [],
    allowedChannels: []
  });
}

function saveConfig(config) {
  writeJson(configFile(), config);
}

function getLog() {
  return readJson(decisionLogFile(), { decisions: [] });
}

function saveLog(log) {
  writeJson(decisionLogFile(), log);
}

function scorePack(pack, config = getConfig()) {
  const reasons = [];
  const risks = [];
  let score = 0;

  if (pack.status === "publishable") {
    score += 30;
    reasons.push("status_publishable");
  } else {
    risks.push("status_not_publishable");
  }

  if (pack.channelId && pack.channelId !== "unknown") {
    score += 15;
    reasons.push("channel_present");
  } else if (config.requireChannel) {
    risks.push("missing_channel");
  }

  if (Array.isArray(pack.providerTargets) && pack.providerTargets.length > 0) {
    score += 15;
    reasons.push("providers_present");
  } else if (config.requireProviders) {
    risks.push("missing_provider_targets");
  }

  if (Array.isArray(pack.assets) && pack.assets.length > 0) {
    score += 15;
    reasons.push("assets_present");
  } else if (config.requireAssets) {
    risks.push("missing_assets");
  }

  if (pack.safeMode) {
    score += 10;
    reasons.push("safe_mode_pack");
  }

  if (pack.approval && pack.approval.approved) {
    score += 15;
    reasons.push("already_approved");
  }

  if (config.allowedChannels.length && !config.allowedChannels.includes(pack.channelId)) {
    risks.push("channel_not_allowed");
    score -= 25;
  }

  if (config.allowedProviders.length) {
    const matched = (pack.providerTargets || []).some((p) => config.allowedProviders.includes(p));
    if (!matched) {
      risks.push("provider_not_allowed");
      score -= 25;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return { score, reasons, risks };
}

function decidePack(pack, config = getConfig()) {
  const scored = scorePack(pack, config);
  const approvalRecommended =
    config.enabled &&
    scored.score >= config.minScoreForApproval &&
    scored.risks.length < config.riskBlockThreshold &&
    (!config.requirePublishable || pack.status === "publishable");

  const dispatchRecommended =
    config.enabled &&
    scored.score >= config.minScoreForDispatch &&
    scored.risks.length < config.riskBlockThreshold &&
    pack.approval &&
    pack.approval.approved;

  const skipReasons = [];

  if (!config.enabled) skipReasons.push("decision_engine_disabled");
  if (config.requirePublishable && pack.status !== "publishable") skipReasons.push("not_publishable");
  if (scored.score < config.minScoreForApproval) skipReasons.push("score_below_approval_threshold");
  if (scored.risks.length >= config.riskBlockThreshold) skipReasons.push("too_many_risk_flags");
  if (!pack.approval || !pack.approval.approved) skipReasons.push("not_approved_for_dispatch");

  return {
    decisionId: "dec_" + crypto.randomBytes(6).toString("hex"),
    contentPackId: pack.contentPackId,
    channelId: pack.channelId,
    title: pack.title,
    providerTargets: pack.providerTargets || [],
    score: scored.score,
    reasons: scored.reasons,
    risks: scored.risks,
    approvalRecommended,
    dispatchRecommended,
    skipReasons,
    createdAt: new Date().toISOString()
  };
}

function evaluateAll(actor = "decision-engine") {
  const config = getConfig();
  const operations = ops.getOperationsCenter();
  const runtimeCenter = runtime.getRuntimeCenter();
  const listed = packs.listContentPacks();
  const decisions = (listed.packs || []).map((pack) => decidePack(pack, config));

  const result = {
    evaluationId: "eval_" + crypto.randomBytes(6).toString("hex"),
    createdAt: new Date().toISOString(),
    actor,
    config,
    guard: runtimeCenter.guard,
    emergencyStop: operations.state && operations.state.emergencyStop,
    totalPacks: decisions.length,
    approvalRecommendations: decisions.filter((d) => d.approvalRecommended).length,
    dispatchRecommendations: decisions.filter((d) => d.dispatchRecommended).length,
    decisions
  };

  const log = getLog();
  log.decisions.push(result);
  saveLog(log);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_decision_evaluation",
    entityType: "decision_engine",
    entityId: result.evaluationId,
    severity: "info",
    metadata: {
      totalPacks: result.totalPacks,
      approvalRecommendations: result.approvalRecommendations,
      dispatchRecommendations: result.dispatchRecommendations
    }
  });

  return { success: true, result };
}

function updateConfig(patch = {}, actor = "admin") {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
    enabled: patch.enabled === undefined ? current.enabled : Boolean(patch.enabled),
    requirePublishable: patch.requirePublishable === undefined ? current.requirePublishable : Boolean(patch.requirePublishable),
    requireAssets: patch.requireAssets === undefined ? current.requireAssets : Boolean(patch.requireAssets),
    requireProviders: patch.requireProviders === undefined ? current.requireProviders : Boolean(patch.requireProviders),
    requireChannel: patch.requireChannel === undefined ? current.requireChannel : Boolean(patch.requireChannel),
    safeModeOnly: patch.safeModeOnly === undefined ? current.safeModeOnly : Boolean(patch.safeModeOnly),
    minScoreForApproval: Number(patch.minScoreForApproval || current.minScoreForApproval || 70),
    minScoreForDispatch: Number(patch.minScoreForDispatch || current.minScoreForDispatch || 80),
    riskBlockThreshold: Number(patch.riskBlockThreshold || current.riskBlockThreshold || 2)
  };

  saveConfig(next);

  audit.appendAuditEvent({
    actor,
    action: "autonomous_decision_config_updated",
    entityType: "decision_engine",
    entityId: "config",
    severity: "warning",
    metadata: next
  });

  return { success: true, config: next };
}

function getDecisionCenter() {
  const config = getConfig();
  const log = getLog();
  const latest = log.decisions && log.decisions.length ? log.decisions[log.decisions.length - 1] : null;

  return {
    success: true,
    phase: "24.4-autonomous-decision-engine",
    config,
    latestEvaluation: latest,
    recentEvaluations: (log.decisions || []).slice(-20).reverse()
  };
}

module.exports = {
  getConfig,
  updateConfig,
  scorePack,
  decidePack,
  evaluateAll,
  getDecisionCenter
};
