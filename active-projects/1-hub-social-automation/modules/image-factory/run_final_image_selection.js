const fs = require("fs");
const path = require("path");
const {
  buildFinalImageSelectionReport
} = require("./services/final_image_selection_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_final_image_selection.js research_script_001");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "modules/image-factory/output");
const regenerationPath = path.join(
  outputDir,
  scriptId + "_image_regeneration_decision_report.json"
);

const regenerationReport = readJson(regenerationPath, null);

if (!regenerationReport) {
  console.error("Missing regeneration decision report. Run:");
  console.error("node modules/image-factory/run_image_regeneration_decision.js " + scriptId);
  process.exit(1);
}

const report = buildFinalImageSelectionReport({
  scriptId,
  regenerationReport
});

const outputPath = path.join(
  outputDir,
  scriptId + "_final_image_selection_report.json"
);

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Final image selection report saved: " + outputPath);
console.table(report.selections.map(x => ({
  scene: x.scene,
  quality: x.quality_score,
  match: x.match_score,
  continuity: x.continuity_score,
  final: x.final_image_readiness_score,
  selected: x.approved_for_video,
  status: x.selection_status
})));
console.log("Summary:", report.summary);
