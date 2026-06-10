const DEFAULT_JOB_CONFIG = {
  version: "1.0.0",
  queue: {
    maxAttempts: 3,
    retryDelayMs: 2000,
    batchSize: 5
  },
  statuses: {
    pending: "pending",
    running: "running",
    completed: "completed",
    failed: "failed",
    paused: "paused",
    cancelled: "cancelled"
  },
  jobTypes: {
    competitor_tracking: "competitor_tracking",
    script_generation: "script_generation",
    image_generation: "image_generation",
    video_rendering: "video_rendering",
    publishing: "publishing",
    system_test: "system_test"
  }
};

module.exports = { DEFAULT_JOB_CONFIG };
