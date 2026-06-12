const queue = require("../queue/publishing_queue");

function getFailureReason(job) {
  return (
    job.result?.error ||
    job.result?.message ||
    job.error ||
    "unknown"
  );
}

function getPublishingFailureAnalytics() {
  const history = queue.listHistory();
  const failed = history.filter((job) => job.status === "failed");

  const reasons = failed.reduce((acc, job) => {
    const reason = getFailureReason(job);
    acc[reason] = acc[reason] || {
      reason,
      count: 0,
      jobs: []
    };

    acc[reason].count += 1;
    acc[reason].jobs.push({
      jobId: job.jobId,
      platform: job.platform,
      providerId: job.providerId,
      attempts: job.attempts,
      completedAt: job.completedAt
    });

    return acc;
  }, {});

  const retryCandidates = failed
    .filter((job) => (job.attempts || 0) < (job.maxAttempts || 3))
    .map((job) => ({
      jobId: job.jobId,
      platform: job.platform,
      providerId: job.providerId,
      attempts: job.attempts || 0,
      maxAttempts: job.maxAttempts || 3,
      reason: getFailureReason(job),
      payload: job.payload || {}
    }));

  return {
    success: true,
    failedCount: failed.length,
    reasonGroups: Object.values(reasons).sort((a, b) => b.count - a.count),
    retryCandidates
  };
}

module.exports = {
  getPublishingFailureAnalytics
};
