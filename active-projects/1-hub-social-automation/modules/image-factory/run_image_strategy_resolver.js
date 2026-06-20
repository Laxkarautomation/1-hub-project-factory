const fs = require("fs");
const path = require("path");
const {
  buildImageGenerationStrategyReport
} = require("./services/image_generation_strategy_resolver");

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_image_strategy_resolver.js research_script_001");
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const script = manifest.find(item => item.script_id === scriptId);

if (!script) {
  console.error("Script not found:", scriptId);
  process.exit(1);
}

const report = buildImageGenerationStrategyReport(script);

const outputPath = path.join(
  process.cwd(),
  "modules/image-factory/output",
  scriptId + "_image_strategy_report.json"
);

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Image generation strategy report saved: " + outputPath);
console.table(report.strategies.map(x => ({
  scene: x.scene,
  intents: x.visual_intents.join(","),
  primary: x.primary_provider,
  fallback: x.fallback_providers.join(" > ")
})));
console.log("Summary:", report.summary);
