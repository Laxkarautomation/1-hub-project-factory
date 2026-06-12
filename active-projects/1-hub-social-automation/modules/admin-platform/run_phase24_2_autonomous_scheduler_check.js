const scheduler = require("./services/autonomous_scheduler_service");
const runtime = require("./services/autonomous_factory_runtime_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase24_2_check");
ops.setEmergencyStop(false, "phase24_2_clear", "phase24_2_check");

runtime.updateConfig({ enabled: true, dryRun: true }, "phase24_2_check");

const config = scheduler.updateConfig({
  enabled: true,
  intervalMinutes: 0,
  maxRunsPerDay: 99
}, "phase24_2_check");

const center = scheduler.getSchedulerCenter();
const plan = scheduler.buildCronPlan();
const due = scheduler.isDue();
const run = scheduler.evaluateAndRun("phase24_2_check");

scheduler.updateConfig({ enabled: false, intervalMinutes: 60 }, "phase24_2_cleanup");
runtime.updateConfig({ enabled: false, dryRun: true }, "phase24_2_cleanup");

const result = {
  success: true,
  phase: "24.2-autonomous-scheduler-cron-control",
  checks: {
    configReady: Boolean(config.success),
    schedulerCenterReady: Boolean(center.success),
    cronPlanReady: Boolean(plan.success),
    dueDetectorReady: typeof due.due === "boolean",
    evaluateRunReady: Boolean(run.success),
    historyReady: Array.isArray(center.recentRuns),
    auditConnectedReady: true
  },
  due,
  runStatus: run.run && run.run.status
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
