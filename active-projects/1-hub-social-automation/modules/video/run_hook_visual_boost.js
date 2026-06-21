const fs = require("fs");
const path = require("path");
const {
  buildHookVisualBoostBatch
} = require("./services/hook_visual_boost_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const outputDir = path.join(process.cwd(), "modules/video/output");
const manifestPath = path.join(outputDir, "optimized_video_manifest.json");
const motionReportPath = path.join(outputDir, "motion_plan_report.json");
const transitionReportPath = path.join(outputDir, "transition_intelligence_report.json");
const outputPath = path.join(outputDir, "hook_visual_boost_report.json");

const manifest = readJson(manifestPath, []);
const motionReport = readJson(motionReportPath, {});
const transitionReport = readJson(transitionReportPath, {});

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

const report = buildHookVisualBoostBatch(manifest, motionReport, transitionReport);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Hook visual boost report saved:", outputPath);
console.table(report.hooks.map(item => ({
  script_id: item.script_id,
  visual: item.visual_intensity_score,
  strength: item.hook_strength_score,
  tease: item.reveal_tease_score,
  status: item.status
})));
console.log("Summary:", report.summary);
