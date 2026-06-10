const { createJob } = require("../core/job_queue_manager");

function scheduleJob({
  type,
  channelId,
  providerService,
  payload = {},
  priority = 5,
  delayMs = 0,
  scheduledAt = null,
  metadata = {}
}) {
  const finalScheduledAt = scheduledAt
    ? new Date(scheduledAt).toISOString()
    : delayMs > 0
      ? new Date(Date.now() + delayMs).toISOString()
      : null;

  return createJob({
    type,
    channelId,
    providerService,
    payload,
    priority,
    scheduledAt: finalScheduledAt,
    metadata
  });
}

function schedulePhase12TestJobs(channelId = "unraaz") {
  const jobs = [];

  jobs.push(scheduleJob({
    type: "system_test",
    channelId,
    payload: {
      message: "Phase 12 system test"
    },
    priority: 1
  }));

  jobs.push(scheduleJob({
    type: "script_generation",
    channelId,
    providerService: "llm",
    payload: {
      topic: "Mystery short script test"
    },
    priority: 2
  }));

  jobs.push(scheduleJob({
    type: "image_generation",
    channelId,
    providerService: "image",
    payload: {
      prompt: "Mystery thumbnail test"
    },
    priority: 3
  }));

  jobs.push(scheduleJob({
    type: "video_rendering",
    channelId,
    providerService: "video",
    payload: {
      scriptId: "test_script_001"
    },
    priority: 4
  }));

  return {
    success: true,
    phase: "12-job-scheduler-test-seed",
    jobs
  };
}

module.exports = {
  scheduleJob,
  schedulePhase12TestJobs
};
