const fs = require("fs");
const path = require("path");
const {
  buildPauseBreathBatchReport
} = require("./pause_breath_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const pacingPath = path.join(process.cwd(), "modules/audio/output/audio_pacing_report.json");
const emotionPath = path.join(process.cwd(), "modules/audio/output/emotion_cue_report.json");

const manifest = readJson(manifestPath, []);
const pacingReport = readJson(pacingPath, {});
const emotionReport = readJson(emotionPath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildPauseBreathBatchReport(manifest, emotionReport, pacingReport);

const outputDir = path.join(process.cwd(), "modules/audio/output");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "pause_breath_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Pause breath report saved:", outputPath);

const first = report.reports[0];
if (first) {
  console.table(first.plans.map(x => ({
    scene: x.scene,
    segment: x.segment,
    emotion: x.primary_emotion,
    pace: x.pace,
    pause: x.pause_ms_each,
    breaths: x.breath_points,
    totalMs: x.total_pause_ms,
    pattern: x.delivery_pattern
  })));
  console.log("First script summary:", first.summary);
}

console.log("Batch summary:", {
  total_scripts: report.total_scripts,
  status: report.status
});
