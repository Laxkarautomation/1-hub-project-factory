const fs = require("fs");
const path = require("path");
const {
  buildOptimizedVideoManifest,
  buildSceneTimingOptimizationBatch
} = require("./services/scene_timing_optimizer");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const outputDir = path.join(process.cwd(), "modules/video/output");
const manifestPath = path.join(outputDir, "video_manifest.json");
const durationReportPath = path.join(process.cwd(), "modules/audio/output/audio_duration_match_report.json");
const optimizedManifestPath = path.join(outputDir, "optimized_video_manifest.json");
const optimizationReportPath = path.join(outputDir, "scene_timing_optimization_report.json");

const manifest = readJson(manifestPath, []);
const durationReport = readJson(durationReportPath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

if (!Array.isArray(durationReport.reports) || durationReport.reports.length === 0) {
  console.error("Missing audio duration match report:", durationReportPath);
  process.exit(1);
}

const optimizedManifest = buildOptimizedVideoManifest(manifest, durationReport);
const optimizationReport = buildSceneTimingOptimizationBatch(manifest, durationReport);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(optimizedManifestPath, JSON.stringify(optimizedManifest, null, 2));
fs.writeFileSync(optimizationReportPath, JSON.stringify(optimizationReport, null, 2));

console.log("Scene timing optimization report saved:", optimizationReportPath);
console.log("Optimized video manifest saved:", optimizedManifestPath);
console.table(optimizationReport.optimizations.map(item => ({
  script_id: item.script_id,
  baseline: item.baseline_total_seconds,
  optimized: item.optimized_total_seconds,
  change: item.total_change_seconds,
  status: item.status
})));
console.log("Summary:", optimizationReport.summary);
