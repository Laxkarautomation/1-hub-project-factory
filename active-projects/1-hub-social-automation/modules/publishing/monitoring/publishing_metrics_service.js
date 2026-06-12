const queue = require("../queue/publishing_queue");
const registry = require("../registry/publishing_registry");
const { getPublishingCredentialsDashboard } = require("../services/publishing_credentials_service");

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || "unknown";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getPublishingMetrics() {
  const activeQueue = queue.listQueue();
  const history = queue.listHistory();
  const allJobs = [...activeQueue, ...history];

  const completed = history.filter((job) => job.status === "completed");
  const failed = history.filter((job) => job.status === "failed");
  const queued = activeQueue.filter((job) => job.status === "queued");
  const running = activeQueue.filter((job) => job.status === "running");

  const byPlatform = groupBy(allJobs, (job) => job.platform);
  const platformMetrics = Object.entries(byPlatform).map(([platform, jobs]) => {
    const platformCompleted = jobs.filter((job) => job.status === "completed").length;
    const platformFailed = jobs.filter((job) => job.status === "failed").length;

    return {
      platform,
      total: jobs.length,
      completed: platformCompleted,
      failed: platformFailed,
      queued: jobs.filter((job) => job.status === "queued").length,
      successRate: percent(platformCompleted, platformCompleted + platformFailed),
      failureRate: percent(platformFailed, platformCompleted + platformFailed)
    };
  });

  return {
    success: true,
    totals: {
      queue: activeQueue.length,
      history: history.length,
      all: allJobs.length,
      completed: completed.length,
      failed: failed.length,
      queued: queued.length,
      running: running.length,
      successRate: percent(completed.length, completed.length + failed.length),
      failureRate: percent(failed.length, completed.length + failed.length)
    },
    platformMetrics,
    latestJobs: allJobs
      .sort((a, b) => new Date(b.updatedAt || b.completedAt || b.createdAt || 0) - new Date(a.updatedAt || a.completedAt || a.createdAt || 0))
      .slice(0, 10)
  };
}

function getProviderReadinessMetrics() {
  const credentials = getPublishingCredentialsDashboard();
  const platforms = registry.listPlatforms();

  const statuses = credentials.providerStatuses || [];
  const ready = statuses.filter((item) => item.ready).length;

  return {
    success: true,
    totalPlatforms: platforms.length,
    totalProviders: statuses.length,
    readyProviders: ready,
    notReadyProviders: statuses.length - ready,
    readinessScore: percent(ready, statuses.length),
    statuses
  };
}

module.exports = {
  getPublishingMetrics,
  getProviderReadinessMetrics
};
