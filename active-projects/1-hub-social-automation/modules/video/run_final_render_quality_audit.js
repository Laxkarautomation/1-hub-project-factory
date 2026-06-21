const fs = require("fs");
const path = require("path");
const {
  buildFinalRenderQualityAuditBatch
} = require("./services/final_render_quality_audit");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const outputDir = path.join(process.cwd(), "modules/video/output");
const manifestPath = path.join(outputDir, "optimized_video_manifest.json");
const motionReportPath = path.join(outputDir, "motion_plan_report.json");
const transitionReportPath = path.join(outputDir, "transition_intelligence_report.json");
const hookReportPath = path.join(outputDir, "hook_visual_boost_report.json");
const retentionReportPath = path.join(outputDir, "retention_cut_pattern_report.json");
const subtitleReportPath = path.join(outputDir, "subtitle_overlay_plan_report.json");
const outputPath = path.join(outputDir, "final_render_quality_audit_report.json");

const manifest = readJson(manifestPath, []);
const motionReport = readJson(motionReportPath, {});
const transitionReport = readJson(transitionReportPath, {});
const hookReport = readJson(hookReportPath, {});
const retentionReport = readJson(retentionReportPath, {});
const subtitleReport = readJson(subtitleReportPath, {});

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

if (!Array.isArray(retentionReport.reports) || retentionReport.reports.length === 0) {
  console.error("Missing retention cut pattern report:", retentionReportPath);
  process.exit(1);
}

if (!Array.isArray(subtitleReport.plans) || subtitleReport.plans.length === 0) {
  console.error("Missing subtitle overlay plan report:", subtitleReportPath);
  process.exit(1);
}

const report = buildFinalRenderQualityAuditBatch(
  manifest,
  motionReport,
  transitionReport,
  hookReport,
  retentionReport,
  subtitleReport,
  path.relative(process.cwd(), manifestPath)
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Final render quality audit report saved:", outputPath);
console.table(report.audits.map(audit => ({
  script_id: audit.script_id,
  overall: audit.overall_render_quality_score,
  band: audit.quality_band,
  issues: audit.detected_issues.length,
  status: audit.status
})));
console.log("Summary:", report.summary);
