const fs = require("fs");
const path = require("path");
const {
  buildTransitionIntelligenceBatch
} = require("./services/transition_intelligence_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const outputDir = path.join(process.cwd(), "modules/video/output");
const optimizedManifestPath = path.join(outputDir, "optimized_video_manifest.json");
const baselineManifestPath = path.join(outputDir, "video_manifest.json");
const manifestPath = fs.existsSync(optimizedManifestPath)
  ? optimizedManifestPath
  : baselineManifestPath;
const outputPath = path.join(outputDir, "transition_intelligence_report.json");

const manifest = readJson(manifestPath, []);

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildTransitionIntelligenceBatch(
  manifest,
  path.relative(process.cwd(), manifestPath)
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Transition intelligence report saved:", outputPath);
console.table(report.plans.map(plan => ({
  script_id: plan.script_id,
  scenes: plan.total_scenes,
  transitions: plan.total_transitions,
  status: plan.status
})));
console.log("Summary:", report.summary);
