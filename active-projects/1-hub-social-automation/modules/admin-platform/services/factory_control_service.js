const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const RUNS_DIR = "storage/admin-platform/factory-runs";
const QUEUE_FILE = "storage/admin-platform/factory-queue/pending_runs.json";

function ensure() {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });

  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 2));
  }
}

function readQueue() {
  ensure();
  return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
}

function saveQueue(queue) {
  ensure();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function getFactoryDashboard() {
  ensure();

  const queue = readQueue();

  const history = fs
    .readdirSync(RUNS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 50)
    .map((file) =>
      JSON.parse(fs.readFileSync(path.join(RUNS_DIR, file), "utf8"))
    );

  return {
    success: true,
    queue,
    history
  };
}

function queueFactoryRun(payload = {}) {
  const queue = readQueue();

  const run = {
    runId: crypto.randomBytes(8).toString("hex"),
    createdAt: new Date().toISOString(),
    status: "pending",
    safeMode: payload.safeMode !== false,
    channelId: payload.channelId || "active",
    providerMode: payload.providerMode || "default"
  };

  queue.push(run);
  saveQueue(queue);

  return {
    success: true,
    run
  };
}

function updateRunStatus(runId, status) {
  const queue = readQueue();
  const run = queue.find((item) => item.runId === runId);

  if (!run) {
    return {
      success: false,
      error: "Factory run not found"
    };
  }

  run.status = status;
  run.updatedAt = new Date().toISOString();

  saveQueue(queue);

  return {
    success: true,
    run
  };
}

function approveFactoryRun(runId) {
  return updateRunStatus(runId, "approved");
}

function cancelFactoryRun(runId) {
  return updateRunStatus(runId, "cancelled");
}

function executeFactoryRun(runId) {
  const queue = readQueue();
  const run = queue.find((item) => item.runId === runId);

  if (!run) {
    return {
      success: false,
      error: "Factory run not found"
    };
  }

  if (run.status === "cancelled") {
    return {
      success: false,
      error: "Cancelled run cannot be executed"
    };
  }

  const startedAt = new Date().toISOString();
  run.status = "running";
  run.startedAt = startedAt;
  saveQueue(queue);

  let output = "";
  let success = true;

  try {
    output = execSync("node run_pipeline.js", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    run.status = "completed";
  } catch (error) {
    success = false;
    output = [
      error.stdout || "",
      error.stderr || "",
      error.message || ""
    ].join("\n");
    run.status = "failed";
  }

  run.completedAt = new Date().toISOString();

  const report = {
    ...run,
    success,
    output
  };

  fs.writeFileSync(
    path.join(RUNS_DIR, `${Date.now()}_${runId}.json`),
    JSON.stringify(report, null, 2)
  );

  saveQueue(queue);

  return {
    success,
    report
  };
}

module.exports = {
  getFactoryDashboard,
  queueFactoryRun,
  approveFactoryRun,
  cancelFactoryRun,
  executeFactoryRun
};
