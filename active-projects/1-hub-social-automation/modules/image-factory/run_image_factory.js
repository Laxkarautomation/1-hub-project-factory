const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../channels/channel_workspace_resolver");

const { getProviderStack } = require("../providers/core/provider_loader");
const { getImageProviders } = require("../providers/registry/image_provider_registry");
const { runFallbackStack } = require("../providers/core/fallback_engine");

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_image_factory.js research_script_001");
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const script = manifest.find(item => item.script_id === scriptId);

if (!script) {
  console.error("Script not found:", scriptId);
  process.exit(1);
}

const stack = getProviderStack("image");
const providers = getImageProviders(stack.fallbacks, stack.keys, stack.providerConfig);

const workspace = workspaceResolver.getWorkspace(scriptId);
const outputDir = workspace.getImagesPath();
fs.mkdirSync(outputDir, { recursive: true });

const outputReportDir = path.join(process.cwd(), "modules/image-factory/output");
const reportPath = path.join(outputReportDir, `${scriptId}_image_factory_report.json`);
const statusPath = path.join(outputReportDir, `${scriptId}_image_status.json`);

function imageExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
}

function summarizeProgress(report, expectedScenes) {
  const generatedImages = report.filter(item =>
    item.status === "generated" || item.status === "ready"
  ).length;
  const skippedImages = report.filter(item => item.status === "ready").length;
  const failedScenes = report
    .filter(item => item.status === "failed")
    .map(item => ({
      scriptId,
      scene: item.scene,
      outputPath: item.outputPath,
      provider: item.provider || null,
      error: item.error || null
    }));

  return {
    scriptId,
    status: generatedImages === expectedScenes.length && failedScenes.length === 0
      ? "completed"
      : "incomplete",
    expectedImages: expectedScenes.length,
    generatedImages,
    failedImages: failedScenes.length,
    skippedImages,
    failedScenes,
    updatedAt: new Date().toISOString()
  };
}

function writeProgress(report, expectedScenes) {
  fs.mkdirSync(outputReportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(statusPath, JSON.stringify(summarizeProgress(report, expectedScenes), null, 2));
}

async function main() {
  const report = [];
  const expectedScenes = Array.isArray(script.scenes) ? script.scenes : [];

  console.log(`Image factory started: ${scriptId}`);
  console.log(`Provider stack: ${stack.fallbacks.join(" → ")}`);

  for (const scene of expectedScenes) {
    const outputPath = path.join(outputDir, `scene_${scene.scene}.jpg`);

    if (imageExists(outputPath)) {
      console.log(`Skipping valid image: scene_${scene.scene}.jpg`);
      report.push({
        scene: scene.scene,
        status: "ready",
        provider: "existing",
        outputPath
      });
      writeProgress(report, expectedScenes);
      continue;
    }

    console.log(`Generating missing image: scene_${scene.scene}.jpg`);

    const result = await runFallbackStack({
      type: "image",
      providers,
      payload: {
        script_id: scriptId,
        scene: scene.scene,
        prompt: scene.image_prompt,
        outputPath,
        providerTimeoutMs: process.env.IMAGE_PROVIDER_TIMEOUT_MS
      }
    });

    const error =
      result.attempts?.find(attempt => attempt.error)?.error ||
      (result.success ? null : "All image providers failed for this scene");

    report.push({
      scene: scene.scene,
      status: result.success ? "generated" : "failed",
      provider: result.provider,
      outputPath,
      attempts: result.attempts,
      error
    });
    writeProgress(report, expectedScenes);
  }

  console.log(`Image factory report saved: ${reportPath}`);
  const summary = summarizeProgress(report, expectedScenes);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "completed") {
    console.error(`Image factory incomplete: ${scriptId}`);
    process.exit(1);
  }

  console.log("Image factory completed.");
}

main().catch(error => {
  fs.mkdirSync(outputReportDir, { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify({
    scriptId,
    status: "failed",
    expectedImages: Array.isArray(script.scenes) ? script.scenes.length : 0,
    generatedImages: 0,
    failedImages: Array.isArray(script.scenes) ? script.scenes.length : 0,
    skippedImages: 0,
    failedScenes: [],
    error: error.message,
    updatedAt: new Date().toISOString()
  }, null, 2));
  console.error(error);
  process.exit(1);
});
