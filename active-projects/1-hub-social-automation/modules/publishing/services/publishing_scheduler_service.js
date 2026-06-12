const {
  getSchedules,
  upsertSchedule,
  updateSchedule,
  getDueSchedules,
  getRuns
} = require("../scheduler/schedule_store");

const {
  runPublishingScheduler
} = require("../scheduler/publishing_scheduler");

function getSchedulerDashboard() {
  const schedules = getSchedules();
  const runs = getRuns();

  return {
    success: true,
    scheduler: {
      totalSchedules: schedules.length,
      scheduled: schedules.filter((s) => s.status === "scheduled").length,
      queued: schedules.filter((s) => s.status === "queued").length,
      failed: schedules.filter((s) => s.status === "failed").length,
      dueNow: getDueSchedules().length,
      latestRun: runs[0] || null
    },
    schedules,
    runs
  };
}

function createSchedule(input = {}) {
  if (!input.publishAt) {
    throw new Error("publishAt is required");
  }

  const schedule = upsertSchedule({
    id: input.id,
    channelId: input.channelId || "unraaz",
    providerId: input.providerId || null,
    platform: input.platform || "youtube",
    contentId: input.contentId || null,
    publishAt: input.publishAt,
    payload: {
      platform: input.platform || "youtube",
      contentType: input.contentType || "video",
      title: input.title || input.payload?.title || "",
      description: input.description || input.payload?.description || "",
      ...(input.payload || {})
    },
    status: input.status || "scheduled",
    maxAttempts: input.maxAttempts || 3
  });

  return {
    success: true,
    schedule
  };
}

function cancelSchedule(scheduleId) {
  if (!scheduleId) {
    throw new Error("scheduleId is required");
  }

  const schedule = updateSchedule(scheduleId, {
    status: "cancelled"
  });

  if (!schedule) {
    throw new Error(`Schedule not found: ${scheduleId}`);
  }

  return {
    success: true,
    schedule
  };
}

async function runSchedulerNow(options = {}) {
  const result = await runPublishingScheduler(options);

  return {
    success: result.success === true,
    result
  };
}

module.exports = {
  getSchedulerDashboard,
  createSchedule,
  cancelSchedule,
  runSchedulerNow
};
