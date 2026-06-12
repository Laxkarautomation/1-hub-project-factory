const registry = require("../registry/publishing_registry");
const queue = require("../queue/publishing_queue");
const { createPublishingAdapter, getAdapterHealth } = require("./publishing_adapter_factory");

function getPublishingDashboard() {
  const platforms = registry.listPlatforms();

  return {
    success: true,
    platforms,
    adapterHealth: platforms.map((platform) =>
      getAdapterHealth(registry.getPlatformConfig(platform.platform))
    ),
    queue: queue.listQueue(),
    history: queue.listHistory()
  };
}

function enqueuePublishingJob(input) {
  const platformConfig = registry.getPlatformConfig(input.platform);

  if (!platformConfig) {
    throw new Error(`Unknown platform: ${input.platform}`);
  }

  return {
    success: true,
    job: queue.enqueuePublishJob(input)
  };
}

async function runNextPublishingJob() {
  const jobs = queue.listQueue();
  const nextJob = jobs
    .filter((job) => job.status === "queued" || job.status === "validated")
    .sort((a, b) => (a.priority || 5) - (b.priority || 5))[0];

  if (!nextJob) {
    return {
      success: true,
      idle: true,
      message: "No publishing jobs in queue"
    };
  }

  queue.updatePublishJob(nextJob.jobId, {
    status: "running",
    attempts: (nextJob.attempts || 0) + 1
  });

  try {
    const platformConfig = registry.getPlatformConfig(nextJob.platform);
    const adapter = createPublishingAdapter(platformConfig, nextJob.providerId);
    const result = await adapter.publish(nextJob);

    const finalJob = queue.moveJobToHistory(
      nextJob.jobId,
      result.success ? "completed" : "failed",
      result
    );

    return {
      success: result.success,
      job: finalJob,
      result
    };
  } catch (error) {
    const failedJob = queue.moveJobToHistory(nextJob.jobId, "failed", {
      error: error.message
    });

    return {
      success: false,
      job: failedJob,
      error: error.message
    };
  }
}

function retryPublishingJob(jobId) {
  return {
    success: true,
    job: queue.retryPublishJob(jobId)
  };
}

module.exports = {
  getPublishingDashboard,
  enqueuePublishingJob,
  runNextPublishingJob,
  retryPublishingJob
};
