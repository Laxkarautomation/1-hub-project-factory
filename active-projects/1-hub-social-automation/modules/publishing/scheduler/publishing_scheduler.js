const fs = require("fs");
const path = require("path");

const {
  getDueSchedules,
  updateSchedule,
  saveRun
} = require("./schedule_store");

const publishingService = require("../services/publishing_service");

const ROOT = process.cwd();

const LOCK_FILE =
  path.join(
    ROOT,
    "storage/publishing/publishing_scheduler.lock"
  );

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const stat = fs.statSync(LOCK_FILE);

    const age =
      Date.now() - stat.mtimeMs;

    if (age < 10 * 60 * 1000) {
      return false;
    }
  }

  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString()
    }, null, 2)
  );

  return true;
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

async function enqueueScheduledPublish(schedule) {

  const platform =
    schedule.platform ||
    schedule.payload?.platform ||
    "youtube";

  const result =
    publishingService.enqueuePublishingJob({
      channelId: schedule.channelId,
      platform,
      providerId: schedule.providerId,
      contentType:
        schedule.payload?.contentType ||
        "video",
      scheduledAt: schedule.publishAt,
      payload: {
        ...schedule.payload,
        scheduleId: schedule.id
      }
    });

  return result.job;
}

async function runPublishingScheduler(options = {}) {

  const nowIso =
    options.nowIso ||
    new Date().toISOString();

  const dryRun =
    options.dryRun !== false;

  if (!acquireLock()) {
    return {
      success: false,
      locked: true
    };
  }

  const run = {
    id:
      "scheduler_run_" +
      Date.now(),
    startedAt:
      new Date().toISOString(),
    nowIso,
    dryRun,
    dueCount: 0,
    enqueuedCount: 0,
    failedCount: 0,
    results: []
  };

  try {

    const due =
      getDueSchedules(nowIso);

    run.dueCount = due.length;

    for (const schedule of due) {

      try {

        const job =
          await enqueueScheduledPublish(
            schedule
          );

        updateSchedule(
          schedule.id,
          {
            status: "queued",
            queueJobId:
              job.jobId,
            lastEnqueuedAt:
              new Date().toISOString(),
            attempts:
              (schedule.attempts || 0) + 1
          }
        );

        run.enqueuedCount++;

        run.results.push({
          scheduleId:
            schedule.id,
          queueJobId:
            job.jobId,
          status:
            "queued"
        });

      } catch (error) {

        run.failedCount++;

        updateSchedule(
          schedule.id,
          {
            attempts:
              (schedule.attempts || 0) + 1,
            lastError:
              error.message
          }
        );

        run.results.push({
          scheduleId:
            schedule.id,
          status:
            "failed",
          error:
            error.message
        });
      }
    }

    run.success = true;
    run.finishedAt =
      new Date().toISOString();

    saveRun(run);

    return run;

  } finally {

    releaseLock();
  }
}

module.exports = {
  runPublishingScheduler
};
