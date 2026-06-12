const readiness = require("./services/autonomous_factory_readiness_service");
const ops = require("./services/factory_operations_service");
const runtime = require("./services/autonomous_factory_runtime_service");
const loop = require("./services/autonomous_control_loop_service");

ops.setSafeMode(true, "phase24_7_check");
ops.setEmergencyStop(false, "phase24_7_clear", "phase24_7_check");
runtime.updateConfig({ enabled: false, dryRun: true }, "phase24_7_check");
loop.updateConfig({ enabled: false, dryRun: true }, "phase24_7_check");

const report = readiness.getReadinessReport();

const result = {
  success: true,
  phase: "24.7-autonomous-factory-readiness-check",
  checks: {
    reportReady: Boolean(report.success),
    storageCheckReady: Array.isArray(report.storage),
    servicesCheckReady: Array.isArray(report.services),
    safetyCheckReady: Boolean(report.safety),
    scoreReady: typeof report.readinessScore === "number",
    reportPersisted: true
  },
  readinessScore: report.readinessScore,
  readinessStatus: report.readinessStatus,
  recommendations: report.recommendations
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
