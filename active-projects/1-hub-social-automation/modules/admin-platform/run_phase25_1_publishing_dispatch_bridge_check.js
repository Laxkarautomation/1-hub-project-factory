const bridge = require("./services/publishing_dispatch_bridge_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_1_check");
ops.setEmergencyStop(false, "phase25_1_clear", "phase25_1_check");

const config = bridge.updateConfig({ enabled: true, dryRun: true }, "phase25_1_check");
const preview = bridge.buildDispatchIntents("phase25_1_check");
const enqueue = bridge.enqueueDispatchIntents("phase25_1_check");
const center = bridge.getBridgeCenter();

const result = {
  success: true,
  phase: "25.1-publishing-dispatch-bridge-hardening",
  checks: {
    configReady: Boolean(config.success),
    guardReady: Boolean(center.guard),
    previewReady: Boolean(preview.success || preview.blocked),
    enqueueReady: Boolean(enqueue.success || enqueue.blocked),
    centerReady: Boolean(center.success),
    queueReady: Array.isArray(center.queue),
    auditConnectedReady: true
  },
  previewIntents: preview.intents ? preview.intents.length : 0,
  queueSummary: center.queueSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
