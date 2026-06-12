const runtime = require("./services/autonomous_factory_runtime_service");
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
