const gate = require("./services/decision_gated_dispatch_service");

const config = gate.updateConfig({ enabled: true, dryRun: true }, "phase24_5_check");
const evaluated = gate.evaluateGate("phase24_5_check");
const run = gate.runDecisionGatedDispatch("phase24_5_check");
const center = gate.getDispatchGateCenter();

const result = {
  success: true,
  phase: "24.5-decision-gated-autonomous-dispatch",
  checks: {
    configReady: Boolean(config.success),
    gateEvaluationReady: Boolean(evaluated.success),
    gateRunReady: Boolean(run.success),
    centerReady: Boolean(center.success),
    recentRunsReady: Array.isArray(center.recentRuns),
    gatePreviewReady: Boolean(center.gatePreview),
    auditConnectedReady: true
  },
  gateAllowed: evaluated.allowedCount,
  runStatus: run.run.status
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
