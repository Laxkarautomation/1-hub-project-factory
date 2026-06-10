const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { STAGES } = require("./workflow_stage_registry");

const ROOT = process.cwd();
const RUN_DIR = path.join(ROOT, "storage/workflows");
const REPORT_DIR = path.join(ROOT, "storage/reports/content-workflow");

function readJsonSafe(file, fallback = null) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getActiveChannel() {
  const file = path.join(ROOT, "modules/channels/storage/active_channel.json");
  const data = readJsonSafe(file, {});
  const channelId = process.env.CHANNEL_ID || data.channelId || data.activeChannelId;
  if (!channelId) throw new Error("No active channel found. Set active channel first.");
  return channelId;
}

function findRunner(stage) {
  for (const rel of stage.candidates) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) return { rel, abs };
  }
  return null;
}

function runStage(stage, context) {
  const runner = findRunner(stage);
  if (!runner) {
    return {
      key: stage.key,
      name: stage.name,
      status: "failed",
      reason: "No runner found",
      candidates: stage.candidates
    };
  }

  const env = {
    ...process.env,
    CHANNEL_ID: context.channelId,
    WORKFLOW_ID: context.workflowId,
    WORKFLOW_RUN_ID: context.runId,
    WORKFLOW_STAGE: stage.key,
    ADMIN_CONFIG_DRIVEN: "true",
    JOB_QUEUE_DRIVEN: "true",
    PROVIDER_AWARE: "true",
    CHANNEL_AWARE: "true"
  };

  const startedAt = new Date().toISOString();
  const result = spawnSync("node", [runner.abs], {
    cwd: ROOT,
    env,
    encoding: "utf8"
  });

  return {
    key: stage.key,
    name: stage.name,
    status: result.status === 0 ? "completed" : "failed",
    runner: runner.rel,
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function createRunState(workflowId, channelId) {
  const runId = `${workflowId}_${channelId}_${Date.now()}`;
  return {
    success: false,
    phase: "13-content-workflow-engine",
    workflowId,
    runId,
    channelId,
    status: "running",
    resumeSafe: true,
    jobQueueDriven: true,
    adminConfigDriven: true,
    providerAware: true,
    channelAware: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    stages: []
  };
}

function runWorkflow(options = {}) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const workflowId = options.workflowId || "default_content_workflow";
  const channelId = options.channelId || getActiveChannel();
  const stateFile = path.join(RUN_DIR, `${workflowId}_${channelId}.json`);

  let state = options.resume ? readJsonSafe(stateFile) : null;
  if (!state) state = createRunState(workflowId, channelId);

  const completed = new Set(
    (state.stages || [])
      .filter(s => s.status === "completed")
      .map(s => s.key)
  );

  for (const stage of STAGES) {
    if (completed.has(stage.key)) continue;

    const stageResult = runStage(stage, {
      workflowId,
      runId: state.runId,
      channelId
    });

    state.stages = state.stages.filter(s => s.key !== stage.key);
    state.stages.push(stageResult);
    writeJson(stateFile, state);

    if (stageResult.status !== "completed") {
      state.status = "failed";
      state.success = false;
      state.completedAt = new Date().toISOString();
      writeJson(stateFile, state);
      writeJson(path.join(REPORT_DIR, "latest_workflow_report.json"), state);
      console.log(JSON.stringify(state, null, 2));
      process.exit(1);
    }
  }

  state.status = "completed";
  state.success = true;
  state.completedAt = new Date().toISOString();

  writeJson(stateFile, state);
  writeJson(path.join(REPORT_DIR, "latest_workflow_report.json"), state);

  console.log(JSON.stringify(state, null, 2));
  return state;
}

module.exports = { runWorkflow };
