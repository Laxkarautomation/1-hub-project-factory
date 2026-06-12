const fs = require("fs");
const path = require("path");

const QUEUE_PATH = path.resolve(process.cwd(), "storage/publishing/publishing_queue.json");
const HISTORY_PATH = path.resolve(process.cwd(), "storage/publishing/publishing_history.json");

function ensureFile(filePath, fallback) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback) {
  ensureFile(filePath, fallback);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  ensureFile(filePath, Array.isArray(data) ? [] : {});
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return readJson(filePath, Array.isArray(data) ? [] : {});
}

function createPublishJob(input) {
  const now = new Date().toISOString();

  return {
    jobId: input.jobId || `publish_${Date.now()}`,
    channelId: input.channelId || null,
    platform: input.platform,
    providerId: input.providerId || null,
    contentType: input.contentType || "video",
    status: "queued",
    priority: input.priority || 5,
    scheduledAt: input.scheduledAt || now,
    payload: input.payload || {},
    attempts: 0,
    maxAttempts: input.maxAttempts || 3,
    createdAt: now,
    updatedAt: now
  };
}

function listQueue() {
  return readJson(QUEUE_PATH, []);
}

function listHistory() {
  return readJson(HISTORY_PATH, []);
}

function enqueuePublishJob(input) {
  if (!input || !input.platform) {
    throw new Error("platform is required");
  }

  const queue = listQueue();
  const job = createPublishJob(input);

  queue.push(job);
  writeJson(QUEUE_PATH, queue);

  return job;
}

function updatePublishJob(jobId, updates) {
  const queue = listQueue();
  const index = queue.findIndex((job) => job.jobId === jobId);

  if (index === -1) {
    throw new Error(`Publish job not found: ${jobId}`);
  }

  queue[index] = {
    ...queue[index],
    ...(updates || {}),
    updatedAt: new Date().toISOString()
  };

  writeJson(QUEUE_PATH, queue);
  return queue[index];
}

function moveJobToHistory(jobId, finalStatus, result = {}) {
  const queue = listQueue();
  const history = listHistory();

  const index = queue.findIndex((job) => job.jobId === jobId);
  if (index === -1) {
    throw new Error(`Publish job not found: ${jobId}`);
  }

  const [job] = queue.splice(index, 1);

  const completedJob = {
    ...job,
    status: finalStatus,
    result,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  history.unshift(completedJob);

  writeJson(QUEUE_PATH, queue);
  writeJson(HISTORY_PATH, history);

  return completedJob;
}

module.exports = {
  QUEUE_PATH,
  HISTORY_PATH,
  createPublishJob,
  enqueuePublishJob,
  listQueue,
  listHistory,
  updatePublishJob,
  moveJobToHistory
};
