const fs = require("fs");
const path = require("path");
const {
  checkImageNarrationMatch
} = require("./services/image_narration_match_checker");

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_image_narration_match.js research_script_001");
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const script = manifest.find(item => item.script_id === scriptId);

if (!script) {
  console.error("Script not found:", scriptId);
  process.exit(1);
}

const report = checkImageNarrationMatch(script);

const outputPath = path.join(
  process.cwd(),
  "modules/image-factory/output",
  `${scriptId}_image_narration_match_report.json`
);

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`Image narration match report saved: ${outputPath}`);
console.table(report.scenes.map(x => ({
  scene: x.scene,
  keyword: x.keyword_coverage_score,
  mood: x.mood_alignment_score,
  specificity: x.visual_specificity_score,
  match: x.match_score,
  status: x.status
})));
console.log("Summary:", {
  average_match_score: report.average_match_score,
  approved_scenes: report.approved_scenes,
  rejected_scenes: report.rejected_scenes,
  status: report.status
});
