const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(rel, fallback = null) {
  try {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(rel, data) {
  const file = path.join(ROOT, rel);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getChannelId() {
  const active = readJson("modules/channels/storage/active_channel.json", {});
  return process.env.CHANNEL_ID || active.channelId || active.activeChannelId || "default";
}

function runNode(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    return { ok: false, skipped: true, reason: "missing", file: rel };
  }

  const result = spawnSync("node", [abs], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8"
  });

  return {
    ok: result.status === 0,
    file: rel,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function stageReport(stage, payload = {}) {
  return {
    success: payload.success !== false,
    stage,
    channelId: getChannelId(),
    workflowId: process.env.WORKFLOW_ID || "default_content_workflow",
    workflowRunId: process.env.WORKFLOW_RUN_ID || null,
    generatedAt: new Date().toISOString(),
    ...payload
  };
}

module.exports = {
  ROOT,
  readJson,
  writeJson,
  getChannelId,
  runNode,
  stageReport
};
