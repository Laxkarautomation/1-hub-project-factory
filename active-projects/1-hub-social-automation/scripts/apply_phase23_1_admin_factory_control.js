const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function backup(file) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.phase23_1.bak`);
  }
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
}

function patch(file, marker, insert, where = "before") {
  let text = fs.readFileSync(file, "utf8");

  if (text.includes(insert.trim().split("\n")[0])) {
    return;
  }

  const index = text.indexOf(marker);

  if (index === -1) {
    throw new Error(`Marker not found in ${file}: ${marker}`);
  }

  if (where === "before") {
    text = text.slice(0, index) + insert + "\n" + text.slice(index);
  } else {
    text =
      text.slice(0, index + marker.length) +
      "\n" +
      insert +
      text.slice(index + marker.length);
  }

  fs.writeFileSync(file, text);
}

ensureDir("storage/admin-platform/factory-runs");
ensureDir("storage/admin-platform/factory-queue");

write(
  "modules/admin-platform/services/factory_control_service.js",
`const fs = require("fs");
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
    ].join("\\n");
    run.status = "failed";
  }

  run.completedAt = new Date().toISOString();

  const report = {
    ...run,
    success,
    output
  };

  fs.writeFileSync(
    path.join(RUNS_DIR, \`\${Date.now()}_\${runId}.json\`),
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
`
);

const serverFile = "modules/admin-platform/api/admin_api_server.js";
backup(serverFile);

patch(
  serverFile,
  'const SETTINGS_FILE = "modules/admin-platform/storage/admin_settings.json";',
`const {
  getFactoryDashboard,
  queueFactoryRun,
  approveFactoryRun,
  cancelFactoryRun,
  executeFactoryRun
} = require("../services/factory_control_service");
`
);

patch(
  serverFile,
  'if (req.url === "/api/auth/login" && req.method === "POST") {',
`    if (req.url === "/api/admin/factory" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getFactoryDashboard());
      });
    }

    if (req.url === "/api/admin/factory/queue" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, queueFactoryRun(body));
      });
    }

    if (req.url === "/api/admin/factory/approve" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, approveFactoryRun(body.runId));
      });
    }

    if (req.url === "/api/admin/factory/cancel" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, cancelFactoryRun(body.runId));
      });
    }

    if (req.url === "/api/admin/factory/run" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, executeFactoryRun(body.runId));
      });
    }
`
);

const indexFile = "modules/admin-platform/ui/index.html";
backup(indexFile);

patch(
  indexFile,
  '<button onclick="loadView(\'publishing\')">Publishing</button>',
`        <button onclick="loadView('factory')">Factory</button>`,
  "after"
);

const appFile = "modules/admin-platform/ui/app.js";
backup(appFile);

patch(
  appFile,
  'if (view === "publishing") {',
`  if (view === "factory") {
    return loadFactoryManager();
  }
`
);

fs.appendFileSync(
  appFile,
`

async function loadFactoryManager() {
  const data = await api("/api/admin/factory");

  const queue = data.queue || [];
  const history = data.history || [];

  document.getElementById("summary").innerHTML = \`
    <div class="tile"><strong>Pending Runs</strong><br>\${queue.length}</div>
    <div class="tile"><strong>Run History</strong><br>\${history.length}</div>
  \`;

  const queueRows = queue.map((run) => \`
    <div class="channel-card">
      <h3>\${run.runId}</h3>
      <p><b>Status:</b> \${run.status}</p>
      <p><b>Safe Mode:</b> \${run.safeMode ? "yes" : "no"}</p>
      <p><b>Channel:</b> \${run.channelId}</p>
      <button onclick="approveFactoryRun('\${run.runId}')">Approve</button>
      <button onclick="executeFactoryRun('\${run.runId}')">Run</button>
      <button onclick="cancelFactoryRun('\${run.runId}')">Cancel</button>
    </div>
  \`).join("");

  document.getElementById("output").innerHTML = \`
    <div class="manager">
      <h2>Factory Control</h2>
      <button onclick="queueFactoryRun()">Queue Safe Factory Run</button>
      <h3>Pending Queue</h3>
      <div class="channel-grid">\${queueRows || "<p>No pending factory runs.</p>"}</div>
      <h3>History</h3>
      <pre>\${JSON.stringify(history, null, 2)}</pre>
    </div>
  \`;
}

async function queueFactoryRun() {
  const result = await api("/api/admin/factory/queue", {
    method: "POST",
    body: JSON.stringify({
      safeMode: true
    })
  });

  show(result);
  await loadFactoryManager();
}

async function approveFactoryRun(runId) {
  const result = await api("/api/admin/factory/approve", {
    method: "POST",
    body: JSON.stringify({ runId })
  });

  show(result);
  await loadFactoryManager();
}

async function executeFactoryRun(runId) {
  const result = await api("/api/admin/factory/run", {
    method: "POST",
    body: JSON.stringify({ runId })
  });

  show(result);
  await loadFactoryManager();
}

async function cancelFactoryRun(runId) {
  const result = await api("/api/admin/factory/cancel", {
    method: "POST",
    body: JSON.stringify({ runId })
  });

  show(result);
  await loadFactoryManager();
}
`
);

console.log("Phase 23.1 admin factory control patch applied.");
