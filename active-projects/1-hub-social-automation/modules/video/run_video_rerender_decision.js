const fs = require("fs");
const path = require("path");
const {
  buildVideoRerenderDecisionBatch
} = require("./services/video_rerender_decision_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const outputDir = path.join(process.cwd(), "modules/video/output");
const finalQualityReportPath = path.join(outputDir, "final_render_quality_audit_report.json");
const retentionReportPath = path.join(outputDir, "retention_cut_pattern_report.json");
const hookReportPath = path.join(outputDir, "hook_visual_boost_report.json");
const outputPath = path.join(outputDir, "video_rerender_decision_report.json");

const finalQualityReport = readJson(finalQualityReportPath, {});
const retentionReport = readJson(retentionReportPath, {});
const hookReport = readJson(hookReportPath, {});

if (!Array.isArray(finalQualityReport.audits) || finalQualityReport.audits.length === 0) {
  console.error("Missing final render quality audit report:", finalQualityReportPath);
  process.exit(1);
}

if (!Array.isArray(retentionReport.reports) || retentionReport.reports.length === 0) {
  console.error("Missing retention cut pattern report:", retentionReportPath);
  process.exit(1);
}

if (!Array.isArray(hookReport.hooks) || hookReport.hooks.length === 0) {
  console.error("Missing hook visual boost report:", hookReportPath);
  process.exit(1);
}

const report = buildVideoRerenderDecisionBatch(
  finalQualityReport,
  retentionReport,
  hookReport
);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Video rerender decision report saved:", outputPath);
console.table(report.decisions.map(item => ({
  script_id: item.script_id,
  approval: item.approval_score,
  decision: item.decision,
  priority: item.rerender_priority,
  reasons: item.decision_reasons.join(",") || "-"
})));
console.log("Summary:", report.summary);
