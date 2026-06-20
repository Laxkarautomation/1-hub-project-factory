const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { readJson, writeJson, runNode, stageReport, ROOT, getChannelId } = require("./_stage_utils");
const workspaceResolver = require("../../channels/channel_workspace_resolver");

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
  const status = readJson(`modules/image-factory/output/${scriptId}_image_status.json`, null);
  return status?.status === "completed";
}

function imageExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
}

function getManifestScripts() {
  const manifest = readJson("modules/video/output/video_manifest.json", []);
  return Array.isArray(manifest) ? manifest : manifest?.videos || manifest?.items || [];
}

function getScriptManifest(scriptId) {
  return getManifestScripts().find(item => item.script_id === scriptId || item.scriptId === scriptId) || null;
}

function getScriptScenes(scriptId) {
  const script = getScriptManifest(scriptId);
  return Array.isArray(script?.scenes) ? script.scenes : [];
}

function getSceneOutputPath(scriptId, scene) {
  const workspace = workspaceResolver.getWorkspace(scriptId);
  return path.join(workspace.getImagesPath(), `scene_${scene.scene}.jpg`);
}

function readFactoryReport(scriptId) {
  return readJson(`modules/image-factory/output/${scriptId}_image_factory_report.json`, []);
}

function summarizeScript(scriptId, runResult = {}) {
  const scenes = getScriptScenes(scriptId);
  const factoryReport = readFactoryReport(scriptId);
  const failedByScene = new Map(
    (Array.isArray(factoryReport) ? factoryReport : [])
      .filter(item => item.status === "failed")
      .map(item => [Number(item.scene), item])
  );

  const sceneSummaries = scenes.map(scene => {
    const outputPath = getSceneOutputPath(scriptId, scene);
    const generated = imageExists(outputPath);
    const failure = failedByScene.get(Number(scene.scene));

    return {
      scriptId,
      scene: scene.scene,
      outputPath,
      status: generated ? "generated" : "failed",
      provider: failure?.provider || null,
      error: generated ? null : failure?.error || runResult.error || "Expected image missing"
    };
  });

  const generatedImages = sceneSummaries.filter(scene => scene.status === "generated").length;
  const failedScenes = sceneSummaries.filter(scene => scene.status === "failed");
  const status = scenes.length > 0 && failedScenes.length === 0 ? "completed" : "incomplete";

  return {
    scriptId,
    status,
    expectedImages: scenes.length,
    generatedImages,
    failedImages: failedScenes.length,
    failedScenes
  };
}

function runFactoryProcess(scriptId, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn("node", [
      path.join(ROOT, "modules/image-factory/run_image_factory.js"),
      scriptId
    ], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    if (timer.unref) timer.unref();

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("error", error => {
      clearTimeout(timer);
      resolve({
        status: null,
        signal: null,
        stdout,
        stderr,
        timedOut,
        error
      });
    });

    child.on("close", (status, signal) => {
      clearTimeout(timer);
      resolve({
        status,
        signal,
        stdout,
        stderr,
        timedOut,
        error: timedOut ? new Error(`Image factory timed out after ${timeoutMs}ms`) : null
      });
    });
  });
}

async function runImageFactory(scriptId) {
  if (statusExists(scriptId) && process.env.FORCE_IMAGE_REGEN !== "true") {
    const summary = summarizeScript(scriptId);
    if (summary.status === "completed") {
      return {
        ...summary,
        scriptId,
        status: "skipped_existing",
        outputStatus: `modules/image-factory/output/${scriptId}_image_status.json`
      };
    }
  }

  const scenes = getScriptScenes(scriptId);
  const providerTimeoutMs = Number.parseInt(process.env.IMAGE_PROVIDER_TIMEOUT_MS || "45000", 10);
  const scriptTimeoutMs = Number.parseInt(
    process.env.IMAGE_FACTORY_SCRIPT_TIMEOUT_MS || "300000",
    10
  );

  const result = await runFactoryProcess(
    scriptId,
    {
      ...process.env,
      CHANNEL_ID: getChannelId(),
      IMAGE_PROVIDER_TIMEOUT_MS: String(providerTimeoutMs),
      IMAGE_PROVIDER_MAX_ATTEMPTS: process.env.IMAGE_PROVIDER_MAX_ATTEMPTS || "2"
    },
    scriptTimeoutMs
  );

  const baseResult = {
    scriptId,
    status: result.status === 0 ? "completed" : result.timedOut ? "timed_out" : "failed",
    exitCode: result.status,
    signal: result.signal || null,
    timedOut: result.timedOut,
    expectedImages: scenes.length,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error?.message || null,
    outputStatus: `modules/image-factory/output/${scriptId}_image_status.json`,
    outputReport: `modules/image-factory/output/${scriptId}_image_factory_report.json`
  };

  const summary = summarizeScript(scriptId, baseResult);
  const status =
    baseResult.status === "timed_out"
      ? "timed_out"
      : summary.status === "completed" && baseResult.status === "completed"
        ? "completed"
        : summary.status;

  return {
    ...baseResult,
    ...summary,
    status
  };
}

async function main() {
  const setupAttempts = [
    runNode("modules/intelligence/services/build_visual_storyboards.js"),
    runNode("modules/images/services/generate_scene_varied_prompts.js"),
    runNode("modules/publishing/services/export_content_pack.js"),
    runNode("modules/video/services/build_video_manifest.js")
  ];

  const scriptIds = detectScriptIds();
  const results = [];

  if (setupAttempts.every(attempt => attempt.ok)) {
    for (const scriptId of scriptIds) {
      results.push(await runImageFactory(scriptId));
    }
  }

  const failed = results.filter(r => r.status === "failed" || r.status === "timed_out" || r.status === "incomplete");
  const expectedImages = results.reduce((sum, result) => sum + (result.expectedImages || 0), 0);
  const generatedImages = results.reduce((sum, result) => sum + (result.generatedImages || 0), 0);
  const failedScenes = results.flatMap(result => result.failedScenes || []);
  const failedImages = failedScenes.length;
  const skippedImages = results
    .filter(result => result.status === "skipped_existing")
    .reduce((sum, result) => sum + (result.generatedImages || 0), 0);
  const incompleteScriptIds = results
    .filter(result => result.status !== "completed" && result.status !== "skipped_existing")
    .map(result => result.scriptId);
  const completedScriptIds = results
    .filter(result => result.status === "completed" || result.status === "skipped_existing")
    .map(result => result.scriptId);
  const setupFailed = !setupAttempts.every(attempt => attempt.ok);
  const success =
    !setupFailed &&
    expectedImages > 0 &&
    generatedImages === expectedImages &&
    failedImages === 0 &&
    incompleteScriptIds.length === 0;

  const report = stageReport("image_generation", {
    success,
    status: success ? "completed" : setupFailed ? "setup_failed" : "failed",
    totalScripts: scriptIds.length,
    expectedImages,
    generatedImages,
    failedImages,
    skippedImages,
    failedScenes,
    completedScriptIds,
    incompleteScriptIds,
    completed: completedScriptIds.length,
    skippedExisting: results.filter(r => r.status === "skipped_existing").length,
    failed: failed.length,
    setupAttempts,
    results
  });

  writeJson("storage/reports/content-workflow/image_generation_stage_report.json", report);
  console.log(JSON.stringify(report, null, 2));

  if (!success) process.exit(1);
}

main().catch(error => {
  const report = stageReport("image_generation", {
    success: false,
    status: "failed",
    error: error.message,
    expectedImages: 0,
    generatedImages: 0,
    failedImages: 0,
    skippedImages: 0,
    failedScenes: [],
    completedScriptIds: [],
    incompleteScriptIds: []
  });

  writeJson("storage/reports/content-workflow/image_generation_stage_report.json", report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
});
