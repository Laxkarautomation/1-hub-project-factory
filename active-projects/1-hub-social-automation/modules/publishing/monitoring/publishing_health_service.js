const { getPublishingDashboard } = require("../services/publishing_service");
const { getPublishingMetrics, getProviderReadinessMetrics } = require("./publishing_metrics_service");
const { getPublishingFailureAnalytics } = require("../analytics/publishing_failure_analytics");
const { getWorkerDashboard } = require("../workers/publishing_worker");
const { getSchedulerDashboard } = require("../services/publishing_scheduler_service");

function getPublishingHealthDashboard() {
  const publishing = getPublishingDashboard();
  const metrics = getPublishingMetrics();
  const readiness = getProviderReadinessMetrics();
  const failures = getPublishingFailureAnalytics();
  const worker = getWorkerDashboard();
  const scheduler = getSchedulerDashboard();

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (
          (metrics.totals.successRate || 0) * 0.35 +
          (readiness.readinessScore || 0) * 0.35 +
          (failures.failedCount === 0 ? 100 : Math.max(0, 100 - failures.failedCount * 10)) * 0.15 +
          (scheduler.scheduler?.dueNow ? 70 : 100) * 0.15
        )
      )
    )
  );

  return {
    success: true,
    health: {
      score: healthScore,
      status:
        healthScore >= 80 ? "healthy" :
        healthScore >= 50 ? "warning" :
        "critical",
      generatedAt: new Date().toISOString()
    },
    publishing,
    metrics,
    readiness,
    failures,
    worker: worker.worker,
    scheduler: scheduler.scheduler
  };
}

module.exports = {
  getPublishingHealthDashboard
};
