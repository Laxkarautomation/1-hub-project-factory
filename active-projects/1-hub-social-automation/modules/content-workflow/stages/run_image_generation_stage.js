const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { readJson, writeJson, stageReport, ROOT } = require("./_stage_utils");

function pad(num) {
  return String(num).padStart(3, "0");
}

function detectScriptIds() {
  const scripts =
    readJson("modules/scripts/output/unraaz_research_scripts.json", null) ||
    readJson("modules/intelligence/output/generated_unraaz_scripts.json", null) ||
    readJson("modules/scripts/output/unraaz_smart_scripts.json", null);

  let count = 10;

  if (Array.isArray(scripts)) count = scripts.length || 10;
  else if (scripts && Array.isArray(scripts.scripts)) count = scripts.scripts.length || 10;
  else if (scripts && Array.isArray(scripts.items)) count = scripts.items.length || 10;

  return Array.from({ length: count }, (_, i) => `research_script_${pad(i + 1)}`);
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

const scriptIds = detectScriptIds();
const results = scriptIds.map(runImageFactory);
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
