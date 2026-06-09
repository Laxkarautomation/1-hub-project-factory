const fs = require("fs");
const path = require("path");

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
const providers = getImageProviders(stack.fallbacks);

const outputDir = path.join(process.cwd(), "storage/images/unraaz", scriptId);
fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const report = [];

  console.log(`Image factory started: ${scriptId}`);
  console.log(`Provider stack: ${stack.fallbacks.join(" → ")}`);

  for (const scene of script.scenes) {
    const outputPath = path.join(outputDir, `scene_${scene.scene}.jpg`);

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      console.log(`Skipping valid image: scene_${scene.scene}.jpg`);
      report.push({
        scene: scene.scene,
        status: "ready",
        provider: "existing",
        outputPath
      });
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
        outputPath
      }
    });

    report.push({
      scene: scene.scene,
      status: result.success ? "generated" : "failed",
      provider: result.provider,
      outputPath,
      attempts: result.attempts
    });
  }

  const reportPath = path.join(
    process.cwd(),
    "modules/image-factory/output",
    `${scriptId}_image_factory_report.json`
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Image factory report saved: ${reportPath}`);
  console.log("Image factory completed.");
}

main();
