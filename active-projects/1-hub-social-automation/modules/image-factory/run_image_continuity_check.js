const fs = require("fs");
const path = require("path");
const {
  checkImageContinuity
} = require("./services/image_continuity_checker");

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_image_continuity_check.js research_script_001");
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const script = manifest.find(item => item.script_id === scriptId);

if (!script) {
  console.error("Script not found:", scriptId);
  process.exit(1);
}

const report = checkImageContinuity(script);

const outputPath = path.join(
  process.cwd(),
  "modules/image-factory/output",
  `${scriptId}_image_continuity_report.json`
);

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`Image continuity report saved: ${outputPath}`);
console.table(report.scene_pairs.map(x => ({
  pair: `${x.from_scene}->${x.to_scene}`,
  env: x.environment_score,
  mood: x.mood_score,
  subject: x.subject_score,
  progression: x.progression_score,
  score: x.continuity_score,
  status: x.status
})));
console.log("Summary:", {
  pair_average_score: report.pair_average_score,
  story_progression_score: report.story_progression_score,
  continuity_score: report.continuity_score,
  status: report.status
});
