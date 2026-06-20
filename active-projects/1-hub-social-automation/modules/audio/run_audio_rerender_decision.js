const fs = require("fs");
const path = require("path");
const {
  buildAudioRerenderDecisionReport
} = require("./audio_rerender_decision_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const outputDir = path.join(process.cwd(), "modules/audio/output");

const manifest = readJson(manifestPath, []);
const voiceProfileReport = readJson(path.join(outputDir, "voice_profile_report.json"), {});
const pacingReport = readJson(path.join(outputDir, "audio_pacing_report.json"), {});
const emotionReport = readJson(path.join(outputDir, "emotion_cue_report.json"), {});
const pauseReport = readJson(path.join(outputDir, "pause_breath_report.json"), {});
const durationReport = readJson(path.join(outputDir, "audio_duration_match_report.json"), {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildAudioRerenderDecisionReport({
  scripts: manifest,
  voiceProfileReport,
  pacingReport,
  emotionReport,
  pauseReport,
  durationReport
});

const outputPath = path.join(outputDir, "audio_rerender_decision_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Audio rerender decision report saved:", outputPath);
console.table(report.decisions.map(x => ({
  script_id: x.script_id,
  score: x.final_audio_readiness_score,
  duration: x.duration_score,
  decision: x.decision,
  reasons: x.reasons.join(",") || "-",
  recommended: x.recommended_total_video_seconds
})));
console.log("Summary:", report.summary);
