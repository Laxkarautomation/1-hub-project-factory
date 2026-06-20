const fs = require("fs");
const path = require("path");
const {
  buildAudioPacingBatchReport
} = require("./audio_pacing_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const voiceProfilePath = path.join(process.cwd(), "modules/audio/output/voice_profile_report.json");

const manifest = readJson(manifestPath, []);
const voiceProfileReport = readJson(voiceProfilePath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildAudioPacingBatchReport(manifest, voiceProfileReport);

const outputDir = path.join(process.cwd(), "modules/audio/output");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "audio_pacing_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Audio pacing report saved:", outputPath);

const first = report.reports[0];
if (first) {
  console.table(first.pacing.map(x => ({
    scene: x.scene,
    segment: x.segment,
    words: x.word_count,
    duration: x.manifest_duration_seconds,
    pace: x.pace,
    speed: x.final_speed_multiplier,
    estimated: x.estimated_spoken_seconds
  })));
  console.log("First script summary:", first.summary);
}

console.log("Batch summary:", {
  total_scripts: report.total_scripts,
  status: report.status
});
