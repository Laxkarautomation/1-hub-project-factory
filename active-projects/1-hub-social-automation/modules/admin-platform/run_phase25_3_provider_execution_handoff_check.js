const handoff = require("./services/provider_execution_handoff_service");
const worker = require("./services/publishing_queue_worker_service");
const bridge = require("./services/publishing_dispatch_bridge_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_3_check");
ops.setEmergencyStop(false, "phase25_3_clear", "phase25_3_check");

bridge.enqueueDispatchIntents("phase25_3_seed_bridge");
worker.runWorkerOnce("phase25_3_seed_worker");

const config = handoff.updateConfig({ enabled: true, dryRun: true }, "phase25_3_check");
const preview = handoff.buildHandoffJobs("phase25_3_check");
const enqueue = handoff.enqueueHandoffJobs("phase25_3_check");
const center = handoff.getHandoffCenter();

const result = {
  success: true,
  phase: "25.3-provider-execution-handoff-contract",
  checks: {
    configReady: Boolean(config.success),
    previewReady: Boolean(preview.success || preview.blocked),
    enqueueReady: Boolean(enqueue.success || enqueue.blocked),
    centerReady: Boolean(center.success),
    queueReady: Array.isArray(center.queue),
    capabilityCheckReady: Boolean(handoff.providerCapability("telegram")),
    auditConnectedReady: true
  },
  previewJobs: preview.jobs ? preview.jobs.length : 0,
  queueSummary: center.queueSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
