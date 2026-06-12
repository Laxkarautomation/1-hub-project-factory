const loop = require("./services/autonomous_control_loop_service");
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
