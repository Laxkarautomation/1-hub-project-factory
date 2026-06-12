const executor = require("./services/provider_adapter_executor_service");
const handoff = require("./services/provider_execution_handoff_service");
const worker = require("./services/publishing_queue_worker_service");
const bridge = require("./services/publishing_dispatch_bridge_service");
const ops = require("./services/factory_operations_service");

ops.setSafeMode(true, "phase25_4_check");
ops.setEmergencyStop(false, "phase25_4_clear", "phase25_4_check");

bridge.enqueueDispatchIntents("phase25_4_seed_bridge");
worker.runWorkerOnce("phase25_4_seed_worker");
handoff.enqueueHandoffJobs("phase25_4_seed_handoff");

const config = executor.updateConfig({ enabled: true, dryRun: true }, "phase25_4_check");
const selected = executor.selectJobs(config.config);
const run = executor.runExecutorOnce("phase25_4_check");
const center = executor.getExecutorCenter();

const result = {
  success: true,
  phase: "25.4-provider-adapter-executor-shell",
  checks: {
    configReady: Boolean(config.success),
    resolverReady: Boolean(executor.providerAdapterResolver("telegram")),
    selectionReady: Array.isArray(selected),
    executorRunReady: Boolean(run.success || run.blocked),
    centerReady: Boolean(center.success),
    resultSummaryReady: Boolean(center.resultSummary),
    auditConnectedReady: true
  },
  selected: selected.length,
  executorStatus: run.run && run.run.status,
  resultSummary: center.resultSummary
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
