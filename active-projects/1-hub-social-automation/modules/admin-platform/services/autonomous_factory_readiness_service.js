const fs = require("fs");
const path = require("path");

const audit = require("./factory_audit_service");
const ops = require("./factory_operations_service");
const packs = require("./content_pack_preview_service");
const runtime = require("./autonomous_factory_runtime_service");
const scheduler = require("./autonomous_scheduler_service");
const retry = require("./self_healing_retry_service");
const decision = require("./autonomous_decision_engine_service");
const gated = require("./decision_gated_dispatch_service");
const loop = require("./autonomous_control_loop_service");

const ROOT = path.resolve(__dirname, "../../..");

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJson(rel, fallback) {
  try {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(rel, data) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function checkStorage() {
  const required = [
    "storage/admin-platform/factory_operations_state.json",
    "storage/admin-platform/factory_emergency_stop.json",
    "storage/admin-platform/factory_audit_log.json",
    "storage/admin-platform/autonomous_runtime_config.json",
    "storage/admin-platform/autonomous_scheduler_config.json",
    "storage/admin-platform/self_healing_retry_config.json",
    "storage/admin-platform/autonomous_decision_config.json",
    "storage/admin-platform/decision_gated_dispatch_config.json",
    "storage/admin-platform/autonomous_control_loop_config.json"
  ];

  return required.map((file) => ({
    file,
    exists: exists(file)
  }));
}

function checkServices() {
  const checks = [];

  function wrap(name, fn) {
    try {
      const result = fn();
      checks.push({ name, success: true, result });
    } catch (err) {
      checks.push({ name, success: false, error: err.message });
    }
  }

  wrap("operations_center", () => ops.getOperationsCenter().success);
  wrap("content_pack_approval_center", () => packs.getApprovalCenter().success);
  wrap("audit_center", () => audit.getAuditCenter().success);
  wrap("audit_chain", () => audit.verifyAuditChain().valid);
  wrap("runtime_center", () => runtime.getRuntimeCenter().success);
  wrap("scheduler_center", () => scheduler.getSchedulerCenter().success);
  wrap("retry_center", () => retry.getRetryCenter().success);
  wrap("decision_center", () => decision.getDecisionCenter().success);
  wrap("decision_gated_dispatch_center", () => gated.getDispatchGateCenter().success);
  wrap("control_loop_center", () => loop.getControlLoopCenter().success);

  return checks;
}

function checkSafety() {
  const operations = ops.getOperationsCenter();
  const runtimeCenter = runtime.getRuntimeCenter();
  const loopCenter = loop.getControlLoopCenter();

  return {
    emergencyStop: Boolean(operations.state && operations.state.emergencyStop),
    safeMode: Boolean(operations.state && operations.state.safeMode),
    runtimeDryRun: Boolean(runtimeCenter.config && runtimeCenter.config.dryRun),
    loopDryRun: Boolean(loopCenter.config && loopCenter.config.dryRun),
    runtimeEnabled: Boolean(runtimeCenter.config && runtimeCenter.config.enabled),
    loopEnabled: Boolean(loopCenter.config && loopCenter.config.enabled),
    safeForProductionDryRun: Boolean(
      operations.state &&
      operations.state.safeMode &&
      runtimeCenter.config &&
      runtimeCenter.config.dryRun &&
      loopCenter.config &&
      loopCenter.config.dryRun
    )
  };
}

function calculateScore(storage, services, safety) {
  const storageScore = storage.filter((x) => x.exists).length / storage.length;
  const serviceScore = services.filter((x) => x.success && x.result !== false).length / services.length;
  const safetyScore = safety.safeForProductionDryRun ? 1 : 0.5;

  return Math.round(((storageScore * 35) + (serviceScore * 45) + (safetyScore * 20)));
}

function getReadinessReport() {
  const storage = checkStorage();
  const services = checkServices();
  const safety = checkSafety();
  const score = calculateScore(storage, services, safety);

  const report = {
    success: true,
    phase: "24.7-autonomous-factory-readiness-check",
    createdAt: new Date().toISOString(),
    readinessScore: score,
    readinessStatus:
      score >= 90 ? "ready_for_safe_dry_run_operations" :
      score >= 75 ? "needs_minor_review" :
      "not_ready",
    storage,
    services,
    safety,
    recommendations: []
  };

  if (!safety.safeMode) report.recommendations.push("Enable factory safe mode before autonomous operations.");
  if (!safety.runtimeDryRun) report.recommendations.push("Keep runtime dryRun enabled until real provider launch testing.");
  if (!safety.loopDryRun) report.recommendations.push("Keep control loop dryRun enabled until production launch approval.");
  if (safety.emergencyStop) report.recommendations.push("Emergency stop is enabled; clear it only after verification.");
  if (score < 90) report.recommendations.push("Review failed service/storage checks before moving to live dispatch.");

  writeJson("storage/admin-platform/autonomous_factory_readiness_report.json", report);

  audit.appendAuditEvent({
    actor: "readiness-check",
    action: "autonomous_factory_readiness_checked",
    entityType: "readiness_report",
    entityId: "latest",
    severity: score >= 90 ? "info" : "warning",
    metadata: {
      readinessScore: score,
      readinessStatus: report.readinessStatus
    }
  });

  return report;
}

module.exports = {
  checkStorage,
  checkServices,
  checkSafety,
  getReadinessReport
};
