const fs = require("fs");
const path = require("path");

const JOB_STORAGE_DIR = path.join(process.cwd(), "storage", "jobs");
const JOB_QUEUE_PATH = path.join(JOB_STORAGE_DIR, "job_queue.json");
const JOB_HISTORY_PATH = path.join(JOB_STORAGE_DIR, "job_history.json");

function ensureJobStorage() {
  if (!fs.existsSync(JOB_STORAGE_DIR)) {
    fs.mkdirSync(JOB_STORAGE_DIR, { recursive: true });
  }

  if (!fs.existsSync(JOB_QUEUE_PATH)) {
    fs.writeFileSync(JOB_QUEUE_PATH, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(JOB_HISTORY_PATH)) {
    fs.writeFileSync(JOB_HISTORY_PATH, JSON.stringify([], null, 2));
  }
}

function readJson(filePath, fallback) {
  ensureJobStorage();

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureJobStorage();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readQueue() {
  return readJson(JOB_QUEUE_PATH, []);
}

function writeQueue(queue) {
  writeJson(JOB_QUEUE_PATH, queue);
  return queue;
}

function readHistory() {
  return readJson(JOB_HISTORY_PATH, []);
}

function writeHistory(history) {
  writeJson(JOB_HISTORY_PATH, history);
  return history;
}

function appendHistory(entry) {
  const history = readHistory();
  history.push(entry);
  writeHistory(history);
  return entry;
}

module.exports = {
  JOB_QUEUE_PATH,
  JOB_HISTORY_PATH,
  ensureJobStorage,
  readQueue,
  writeQueue,
  readHistory,
  writeHistory,
  appendHistory
};
