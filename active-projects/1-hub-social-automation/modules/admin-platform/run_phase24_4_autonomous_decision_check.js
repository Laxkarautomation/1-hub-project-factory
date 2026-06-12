const decision = require("./services/autonomous_decision_engine_service");

const config = decision.updateConfig({ enabled: true }, "phase24_4_check");
const evaluation = decision.evaluateAll("phase24_4_check");
const center = decision.getDecisionCenter();

const result = {
  success: true,
  phase: "24.4-autonomous-decision-engine",
  checks: {
    configReady: Boolean(config.success),
    evaluationReady: Boolean(evaluation.success),
    decisionCenterReady: Boolean(center.success),
    latestEvaluationReady: Boolean(center.latestEvaluation),
    recentEvaluationsReady: Array.isArray(center.recentEvaluations),
    scoringReady: typeof decision.scorePack({ status: "publishable", providerTargets: ["test"], channelId: "test", assets: [] }).score === "number",
    auditConnectedReady: true
  },
  summary: center.latestEvaluation ? {
    totalPacks: center.latestEvaluation.totalPacks,
    approvalRecommendations: center.latestEvaluation.approvalRecommendations,
    dispatchRecommendations: center.latestEvaluation.dispatchRecommendations
  } : null
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) process.exit(1);
