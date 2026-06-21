const fs = require("fs");
const path = require("path");
const {
  buildRetentionCutPatternBatch
} = require("./services/retention_cut_pattern_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const outputDir = path.join(process.cwd(), "modules/video/output");
const manifestPath = path.join(outputDir, "optimized_video_manifest.json");
const motionReportPath = path.join(outputDir, "motion_plan_report.json");
const transitionReportPath = path.join(outputDir, "transition_intelligence_report.json");
const hookReportPath = path.join(outputDir, "hook_visual_boost_report.json");
const outputPath = path.join(outputDir, "retention_cut_pattern_report.json");

const manifest = readJson(manifestPath, []);
const motionReport = readJson(motionReportPath, {});
const transitionReport = readJson(transitionReportPath, {});
const hookReport = readJson(hookReportPath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing optimized video manifest:", manifestPath);
  process.exit(1);
}

if (!Array.isArray(motionReport.plans) || motionReport.plans.length === 0) {
  console.error("Missing motion plan report:", motionReportPath);
  process.exit(1);
}

if (!Array.isArray(transitionReport.plans) || transitionReport.plans.length === 0) {
  console.error("Missing transition intelligence report:", transitionReportPath);
  process.exit(1);
}

if (!Array.isArray(hookReport.hooks) || hookReport.hooks.length === 0) {
  console.error("Missing hook visual boost report:", hookReportPath);
  process.exit(1);
}

const report = buildRetentionCutPatternBatch(
  manifest,
  motionReport,
  transitionReport,
  hookReport,
  path.relative(process.cwd(), manifestPath)
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Retention cut pattern report saved:", outputPath);
console.table(report.reports.map(item => ({
  script_id: item.script_id,
  retention: item.retention_score,
  risk: item.viewer_drop_risk,
  cut_density: item.cut_density,
  recommendations: item.recommendations.length,
  status: item.status
})));
console.log("Summary:", report.summary);
