const crypto = require("crypto");
const {
  readQueue,
  writeQueue,
  appendHistory
} = require("./job_store");

function now() {
  return new Date().toISOString();
}

function createJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function createJob({
  type,
  channelId,
  providerService,
  payload = {},
  priority = 5,
  maxAttempts = 3,
  scheduledAt = null,
  metadata = {}
}) {
  if (!type) throw new Error("Job type is required.");

  const job = {
    id: createJobId(),
    type,
    status: "pending",
    channelId: channelId || null,
    providerService: providerService || null,
    payload,
    priority,
    attempts: 0,
    maxAttempts,
    scheduledAt,
    lockedAt: null,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    lastError: null,
    result: null,
    metadata,
    createdAt: now(),
    updatedAt: now()
  };

  const queue = readQueue();
  queue.push(job);

  queue.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  writeQueue(queue);

  appendHistory({
    event: "job_created",
    jobId: job.id,
    type: job.type,
    channelId: job.channelId,
    timestamp: now()
  });

  return job;
}

function listJobs(filter = {}) {
  const queue = readQueue();

  return queue.filter((job) => {
    if (filter.status && job.status !== filter.status) return false;
    if (filter.type && job.type !== filter.type) return false;
    if (filter.channelId && job.channelId !== filter.channelId) return false;
    return true;
  });
}

function getJob(jobId) {
  return readQueue().find((job) => job.id === jobId) || null;
}

function updateJob(jobId, patch) {
  const queue = readQueue();
  const index = queue.findIndex((job) => job.id === jobId);

  if (index === -1) {
    throw new Error(`Job not found: ${jobId}`);
  }

  queue[index] = {
    ...queue[index],
    ...patch,
    updatedAt: now()
  };

  writeQueue(queue);

  appendHistory({
    event: "job_updated",
    jobId,
    patch,
    timestamp: now()
  });

  return queue[index];
}

function cancelJob(jobId) {
  return updateJob(jobId, {
    status: "cancelled",
    lockedAt: null
  });
}

function resetRunningJobs() {
  const queue = readQueue();
  let count = 0;

  const updated = queue.map((job) => {
    if (job.status === "running") {
      count += 1;
      return {
        ...job,
        status: "pending",
        lockedAt: null,
        startedAt: null,
        updatedAt: now(),
        lastError: "Reset from running state for resume safety."
      };
    }

    return job;
  });

  writeQueue(updated);

  appendHistory({
    event: "running_jobs_reset",
    count,
    timestamp: now()
  });

  return { success: true, count };
}

function getNextPendingJob() {
  const queue = readQueue();
  const currentTime = Date.now();

  const job = queue.find((item) => {
    if (item.status !== "pending") return false;
    if (!item.scheduledAt) return true;
    return new Date(item.scheduledAt).getTime() <= currentTime;
  });

  if (!job) return null;

  return updateJob(job.id, {
    status: "running",
    lockedAt: now(),
    startedAt: now(),
    attempts: job.attempts + 1
  });
}

function completeJob(jobId, result) {
  return updateJob(jobId, {
    status: "completed",
    completedAt: now(),
    lockedAt: null,
    result,
    lastError: null
  });
}

function failJob(jobId, error) {
  const job = getJob(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const shouldRetry = job.attempts < job.maxAttempts;

  return updateJob(jobId, {
    status: shouldRetry ? "pending" : "failed",
    failedAt: shouldRetry ? null : now(),
    lockedAt: null,
    lastError: error.message || String(error)
  });
}

function queueSummary() {
  const queue = readQueue();

  const summary = {
    total: queue.length,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    cancelled: 0
  };

  for (const job of queue) {
    if (summary[job.status] !== undefined) {
      summary[job.status] += 1;
    }
  }

  return summary;
}

module.exports = {
  createJob,
  listJobs,
  getJob,
  updateJob,
  cancelJob,
  resetRunningJobs,
  getNextPendingJob,
  completeJob,
  failJob,
  queueSummary
};
