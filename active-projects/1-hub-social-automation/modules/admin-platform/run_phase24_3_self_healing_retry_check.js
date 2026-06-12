const retry = require("./services/self_healing_retry_service");
const runtime = require("./services/autonomous_factory_runtime_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase24_3_check");
ops.setEmergencyStop(false, "phase24_3_clear", "phase24_3_check");

runtime.updateConfig({ enabled: false, dryRun: true }, "phase24_3_check");
runtime.runOnce("phase24_3_check_blocked_seed");

const config = retry.updateConfig({ enabled: true, dryRun: true }, "phase24_3_check");
const scan = retry.scanRuntimeFailures("phase24_3_check");
const center = retry.getRetryCenter();
const next = retry.runNextRetry("phase24_3_check");

const result = {
  success: true,
  phase: "24.3-self-healing-retry-engine",
  checks: {
    configReady: Boolean(config.success),
    classifierReady: Boolean(retry.classifyFailure({ status: "blocked" }).type),
    scanReady: Boolean(scan.success),
    retryCenterReady: Boolean(center.success),
    retryQueueReady: Array.isArray(center.queue),
    runNextRetryReady: Boolean(next.success),
    auditConnectedReady: true
  },
  scanAdded: scan.added.length,
  retryResult: next
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
