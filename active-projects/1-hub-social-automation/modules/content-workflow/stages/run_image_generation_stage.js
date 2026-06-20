const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { readJson, writeJson, runNode, stageReport, ROOT, getChannelId } = require("./_stage_utils");

function pad(num) {
  return String(num).padStart(3, "0");
}

function detectScriptIds() {
  const visualStoryboards = readJson("modules/intelligence/output/visual_storyboards.json", null);
  const storyboardItems = visualStoryboards?.storyboards || [];
  const storyboardIds = storyboardItems
    .map((item, index) =>
      item.script_id ||
      item.scriptId ||
      `${getChannelId()}_visual_script_${pad(index + 1)}`
    )
    .filter(Boolean);

  if (storyboardIds.length) return storyboardIds;

  const scripts =
    readJson(`modules/intelligence/output/generated_${getChannelId()}_scripts.json`, null) ||
    readJson(`modules/scripts/output/${getChannelId()}_research_scripts.json`, null) ||
    readJson(`modules/scripts/output/${getChannelId()}_smart_scripts.json`, null);

  const items = Array.isArray(scripts)
    ? scripts
    : (scripts?.scripts || scripts?.items || []);

  const ids = items
    .map((item, index) =>
      item.script_id ||
      item.scriptId ||
      item.id ||
      `research_script_${pad(index + 1)}`
    )
    .filter(Boolean);

  return ids.length ? ids : Array.from({ length: 10 }, (_, i) => `research_script_${pad(i + 1)}`);
}

function statusExists(scriptId) {
  return fs.existsSync(
    path.join(ROOT, `modules/image-factory/output/${scriptId}_image_status.json`)
  );
}

function runImageFactory(scriptId) {
  if (statusExists(scriptId) && process.env.FORCE_IMAGE_REGEN !== "true") {
    return {
      scriptId,
      status: "skipped_existing",
      outputStatus: `modules/image-factory/output/${scriptId}_image_status.json`
    };
  }

  const result = spawnSync("node", [
    path.join(ROOT, "modules/image-factory/run_image_factory.js"),
    scriptId
  ], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8"
  });

  return {
    scriptId,
    status: result.status === 0 ? "completed" : "failed",
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    outputStatus: `modules/image-factory/output/${scriptId}_image_status.json`,
    outputReport: `modules/image-factory/output/${scriptId}_image_factory_report.json`
  };
}

const setupAttempts = [
  runNode("modules/intelligence/services/build_visual_storyboards.js"),
  runNode("modules/images/services/generate_scene_varied_prompts.js"),
  runNode("modules/publishing/services/export_content_pack.js"),
  runNode("modules/video/services/build_video_manifest.js")
];

const scriptIds = detectScriptIds();
const results = setupAttempts.every(attempt => attempt.ok)
  ? scriptIds.map(runImageFactory)
  : [];
const failed = results.filter(r => r.status === "failed");

const report = stageReport("image_generation", {
  success: failed.length === 0,
  totalScripts: scriptIds.length,
  completed: results.filter(r => r.status === "completed").length,
  skippedExisting: results.filter(r => r.status === "skipped_existing").length,
  failed: failed.length,
  results
});

writeJson("storage/reports/content-workflow/image_generation_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));

if (failed.length > 0) process.exit(1);
