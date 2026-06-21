const fs = require("fs");
const path = require("path");
const {
  buildSubtitleOverlayPlanBatch
} = require("./services/subtitle_overlay_planner");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const videoOutputDir = path.join(process.cwd(), "modules/video/output");
const audioOutputDir = path.join(process.cwd(), "modules/audio/output");
const manifestPath = path.join(videoOutputDir, "optimized_video_manifest.json");
const audioPacingReportPath = path.join(audioOutputDir, "audio_pacing_report.json");
const emotionCueReportPath = path.join(audioOutputDir, "emotion_cue_report.json");
const retentionReportPath = path.join(videoOutputDir, "retention_cut_pattern_report.json");
const outputPath = path.join(videoOutputDir, "subtitle_overlay_plan_report.json");

const manifest = readJson(manifestPath, []);
const audioPacingReport = readJson(audioPacingReportPath, {});
const emotionCueReport = readJson(emotionCueReportPath, {});
const retentionReport = readJson(retentionReportPath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing optimized video manifest:", manifestPath);
  process.exit(1);
}

if (!Array.isArray(audioPacingReport.reports) || audioPacingReport.reports.length === 0) {
  console.error("Missing audio pacing report:", audioPacingReportPath);
  process.exit(1);
}

if (!Array.isArray(emotionCueReport.reports) || emotionCueReport.reports.length === 0) {
  console.error("Missing emotion cue report:", emotionCueReportPath);
  process.exit(1);
}

if (!Array.isArray(retentionReport.reports) || retentionReport.reports.length === 0) {
  console.error("Missing retention cut pattern report:", retentionReportPath);
  process.exit(1);
}

const report = buildSubtitleOverlayPlanBatch(
  manifest,
  audioPacingReport,
  emotionCueReport,
  retentionReport,
  path.relative(process.cwd(), manifestPath)
);

fs.mkdirSync(videoOutputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Subtitle overlay plan report saved:", outputPath);
console.table(report.plans.map(plan => ({
  script_id: plan.script_id,
  scenes: plan.total_scenes,
  readability: plan.average_readability_score,
  issues: plan.detected_issues.length,
  status: plan.status
})));
console.log("Summary:", report.summary);
