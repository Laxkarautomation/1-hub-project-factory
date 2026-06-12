const bridge = require("./services/publishing_dispatch_bridge_service");
const worker = require("./services/publishing_queue_worker_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_2_check");
ops.setEmergencyStop(false, "phase25_2_clear", "phase25_2_check");

bridge.enqueueDispatchIntents("phase25_2_seed");

const config = worker.updateConfig({ enabled: true, dryRun: true }, "phase25_2_check");
const selected = worker.selectQueueItems(config.config);
const run = worker.runWorkerOnce("phase25_2_check");
const center = worker.getWorkerCenter();

const result = {
  success: true,
  phase: "25.2-publishing-queue-worker-execution-tracker",
  checks: {
    configReady: Boolean(config.success),
    selectionReady: Array.isArray(selected),
    workerRunReady: Boolean(run.success || run.blocked),
    centerReady: Boolean(center.success),
    queueSummaryReady: Boolean(center.queueSummary),
    executionSummaryReady: Boolean(center.executionSummary),
    auditConnectedReady: true
  },
  selected: selected.length,
  workerStatus: run.run && run.run.status,
  queueSummary: center.queueSummary,
  executionSummary: center.executionSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
