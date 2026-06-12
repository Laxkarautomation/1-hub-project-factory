const fs = require("fs");
const path = require("path");

const {
  listQueue,
  listHistory
} = require("../queue/publishing_queue");

const {
  runNextPublishingJob
} = require("../services/publishing_service");

const ROOT = process.cwd();
const WORKER_RUNS_FILE = path.join(ROOT, "storage/publishing/publishing_worker_runs.json");

function ensureFile(file, fallback) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}

function readJson(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureFile(file, data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function saveWorkerRun(run) {
  const data = readJson(WORKER_RUNS_FILE, { version: 1, runs: [] });
  data.runs = Array.isArray(data.runs) ? data.runs : [];
  data.runs.unshift(run);
  data.runs = data.runs.slice(0, 200);
  writeJson(WORKER_RUNS_FILE, data);
  return run;
}

function getWorkerDashboard() {
  const data = readJson(WORKER_RUNS_FILE, { version: 1, runs: [] });

  return {
    success: true,
    queue: listQueue(),
    history: listHistory(),
    worker: {
      totalRuns: data.runs.length,
      latestRun: data.runs[0] || null,
      completed: data.runs.filter((r) => r.status === "completed").length,
      failed: data.runs.filter((r) => r.status === "failed").length,
      idle: data.runs.filter((r) => r.status === "idle").length
    },
    runs: data.runs
  };
}

async function runPublishingWorkerOnce(options = {}) {
  const run = {
    id: `publishing_worker_run_${Date.now()}`,
    mode: options.mode || "once",
    dryRun: options.dryRun !== false,
    startedAt: new Date().toISOString(),
    status: "running",
    result: null,
    error: null
  };

  try {
    const beforeQueue = listQueue();
    run.beforeQueueCount = beforeQueue.length;

    const result = await runNextPublishingJob();

    run.result = result;
    run.afterQueueCount = listQueue().length;
    run.afterHistoryCount = listHistory().length;

    if (result.idle) {
      run.status = "idle";
    } else if (result.success) {
      run.status = "completed";
    } else {
      run.status = "failed";
    }

    run.finishedAt = new Date().toISOString();

    saveWorkerRun(run);

    return {
      success: run.status !== "failed",
      run
    };
  } catch (error) {
    run.status = "failed";
    run.error = error.message;
    run.finishedAt = new Date().toISOString();

    saveWorkerRun(run);

    return {
      success: false,
      run,
      error: error.message
    };
  }
}

async function runPublishingWorkerBatch(options = {}) {
  const limit = Number(options.limit || 5);
  const results = [];

  for (let i = 0; i < limit; i++) {
    const result = await runPublishingWorkerOnce({
      ...options,
      mode: "batch"
    });

    results.push(result);

    if (result.run?.status === "idle") {
      break;
    }
  }

  return {
    success: results.every((r) => r.success),
    limit,
    runs: results.map((r) => r.run),
    completed: results.filter((r) => r.run?.status === "completed").length,
    failed: results.filter((r) => r.run?.status === "failed").length,
    idle: results.filter((r) => r.run?.status === "idle").length
  };
}

module.exports = {
  WORKER_RUNS_FILE,
  getWorkerDashboard,
  runPublishingWorkerOnce,
  runPublishingWorkerBatch
};
