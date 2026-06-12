const ops = require("./services/factory_operations_service");

const center = ops.getOperationsCenter();
const safeOn = ops.setSafeMode(true, "phase23_3_check");
const emergencyOn = ops.setEmergencyStop(true, "phase23_3_test", "phase23_3_check");
const emergencyOff = ops.setEmergencyStop(false, "phase23_3_test_clear", "phase23_3_check");
const recovery = ops.runRecoveryAction("refresh_status", "phase23_3_check");

const result = {
  success: true,
  phase: "23.3-factory-operations-center",
  checks: {
    operationsCenterLoaded: Boolean(center.success),
    metricsReady: Boolean(center.metrics),
    monitorsReady: Boolean(center.monitors),
    providerHealthMonitorReady: Array.isArray(center.monitors.providerHealth),
    queueMonitorReady: Array.isArray(center.monitors.queue),
    publishingMonitorReady: Array.isArray(center.monitors.publishing),
    channelHealthReady: Boolean(center.monitors.channelHealth),
    recentRunsReady: Array.isArray(center.recentRuns),
    failureDiagnosticsReady: Array.isArray(center.failureDiagnostics),
    safeModeControlsReady: Boolean(safeOn.success),
    emergencyStopControlsReady: Boolean(emergencyOn.success && emergencyOff.success),
    recoveryActionsReady: Boolean(recovery.success)
  },
  summary: center.metrics
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) {
  process.exit(1);
}
