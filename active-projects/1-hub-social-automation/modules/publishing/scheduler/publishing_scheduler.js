const fs = require("fs");
const path = require("path");
const {
  getDueSchedules,
  updateSchedule,
  saveRun
} = require("./schedule_store");

const ROOT = process.cwd();
const LOCK_FILE = path.join(ROOT, "storage/publishing/publishing_scheduler.lock");

function loadQueueModule() {
  const candidates = [
    "../queue/publishing_queue",
    "../queue/publishing_queue.js"
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }

  return null;
}

function enqueueFallback(schedule) {
  const queueFile = path.join(ROOT, "storage/publishing/publishing_queue.json");

  if (!fs.existsSync(path.dirname(queueFile))) {
    fs.mkdirSync(path.dirname(queueFile), { recursive: true });
  }

  let data = { version: 1, jobs: [] };

  if (fs.existsSync(queueFile)) {
    try {
      data = JSON.parse(fs.readFileSync(queueFile, "utf8"));
    } catch {}
  }

  if (!Array.isArray(data.jobs)) data.jobs = [];

  const duplicate = data.jobs.find((j) => j.scheduleId === schedule.id);
  if (duplicate) return duplicate;

  const job = {
    id: `pub_job_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: "scheduled_publish",
    scheduleId: schedule.id,
    channelId: schedule.channelId,
    providerId: schedule.providerId,
    contentId: schedule.contentId,
    payload: schedule.payload || {},
    status: "queued",
    attempts: 0,
    createdAt: new Date().toISOString()
  };

  data.jobs.push(job);
  fs.writeFileSync(queueFile, JSON.stringify(data, null, 2));
  return job;
}

function enqueueSchedule(schedule) {
  const queue = loadQueueModule();

  if (queue) {
    if (typeof queue.enqueuePublishingJob === "function") {
      return queue.enqueuePublishingJob({
        type: "scheduled_publish",
        scheduleId: schedule.id,
        channelId: schedule.channelId,
        providerId: schedule.providerId,
        contentId: schedule.contentId,
        payload: schedule.payload || {}
      });
    }

    if (typeof queue.enqueue === "function") {
      return queue.enqueue({
        type: "scheduled_publish",
        scheduleId: schedule.id,
        channelId: schedule.channelId,
        providerId: schedule.providerId,
        contentId: schedule.contentId,
        payload: schedule.payload || {}
      });
    }
  }

  return enqueueFallback(schedule);
}

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const stat = fs.statSync(LOCK_FILE);
    const ageMs = Date.now() - stat.mtimeMs;

    if (ageMs < 10 * 60 * 1000) {
      return false;
    }
  }

  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString()
  }, null, 2));

  return true;
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
}

async function runPublishingScheduler(options = {}) {
  const nowIso = options.nowIso || new Date().toISOString();
  const dryRun = options.dryRun !== false;

  if (!acquireLock()) {
    return {
      success: false,
      locked: true,
      message: "Publishing scheduler already running"
    };
  }

  const run = {
    id: `scheduler_run_${Date.now()}`,
    startedAt: new Date().toISOString(),
    nowIso,
    dryRun,
    dueCount: 0,
    enqueuedCount: 0,
    failedCount: 0,
    results: []
  };

  try {
    const dueSchedules = getDueSchedules(nowIso);
    run.dueCount = dueSchedules.length;

    for (const schedule of dueSchedules) {
      try {
        const job = enqueueSchedule(schedule);

        updateSchedule(schedule.id, {
          status: "queued",
          attempts: (schedule.attempts || 0) + 1,
          lastEnqueuedAt: new Date().toISOString(),
          queueJobId: job.id || job.jobId || null
        });

        run.enqueuedCount++;

        run.results.push({
          scheduleId: schedule.id,
          status: "queued",
          queueJobId: job.id || job.jobId || null
        });
      } catch (error) {
        updateSchedule(schedule.id, {
          attempts: (schedule.attempts || 0) + 1,
          lastError: error.message
        });

        run.failedCount++;

        run.results.push({
          scheduleId: schedule.id,
          status: "failed",
          error: error.message
        });
      }
    }

    run.success = true;
    run.finishedAt = new Date().toISOString();
    saveRun(run);

    return run;
  } finally {
    releaseLock();
  }
}

module.exports = {
  runPublishingScheduler
};
