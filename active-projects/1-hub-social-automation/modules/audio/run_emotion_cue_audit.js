const fs = require("fs");
const path = require("path");
const {
  buildEmotionCueBatchReport
} = require("./emotion_cue_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const pacingPath = path.join(process.cwd(), "modules/audio/output/audio_pacing_report.json");

const manifest = readJson(manifestPath, []);
const pacingReport = readJson(pacingPath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildEmotionCueBatchReport(manifest, pacingReport);

const outputDir = path.join(process.cwd(), "modules/audio/output");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "emotion_cue_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Emotion cue report saved:", outputPath);

const first = report.reports[0];
if (first) {
  console.table(first.cues.map(x => ({
    scene: x.scene,
    segment: x.segment,
    emotion: x.primary_emotion,
    intensity: x.emotion_intensity,
    cue: x.delivery_cue
  })));
  console.log("First script summary:", first.summary);
}

console.log("Batch summary:", {
  total_scripts: report.total_scripts,
  status: report.status
});
