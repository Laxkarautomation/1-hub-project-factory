const fs = require("fs");
const path = require("path");
const {
  buildVoiceProfileReport
} = require("./voice_profile_resolver");

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const report = buildVoiceProfileReport(manifest);

const outputDir = path.join(process.cwd(), "modules/audio/output");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "voice_profile_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Voice profile report saved:", outputPath);
console.table(report.profiles.map(x => ({
  script_id: x.script_id,
  profile: x.selected_profile,
  intents: x.detected_intents.join(","),
  speed: x.profile.speedMultiplier,
  emotion: x.profile.emotionBase
})));
console.log("Summary:", {
  total_scripts: report.total_scripts,
  profile_counts: report.profile_counts,
  status: report.status
});
