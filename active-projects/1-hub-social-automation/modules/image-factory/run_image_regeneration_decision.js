const fs = require("fs");
const path = require("path");
const {
  buildRegenerationDecisionReport
} = require("./services/image_regeneration_decision_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_image_regeneration_decision.js research_script_001");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "modules/image-factory/output");

const qualityPath = path.join(outputDir, scriptId + "_image_status.json");
const matchPath = path.join(outputDir, scriptId + "_image_narration_match_report.json");
const continuityPath = path.join(outputDir, scriptId + "_image_continuity_report.json");

const qualityReport = readJson(qualityPath, []);
const matchReport = readJson(matchPath, {});
const continuityReport = readJson(continuityPath, {});

if (!Array.isArray(qualityReport) || qualityReport.length === 0) {
  console.error("Missing quality report. Run:");
  console.error("node modules/image-factory/run_image_audit.js " + scriptId);
  process.exit(1);
}

const report = buildRegenerationDecisionReport({
  scriptId,
  qualityReport,
  matchReport,
  continuityReport
});

const outputPath = path.join(
  outputDir,
  scriptId + "_image_regeneration_decision_report.json"
);

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Image regeneration decision report saved: " + outputPath);
console.table(report.decisions.map(x => ({
  scene: x.scene,
  quality: x.quality_score,
  match: x.match_score,
  continuity: x.continuity_score,
  readiness: x.final_image_readiness_score,
  decision: x.decision,
  reasons: x.reasons.join(",") || "-"
})));
console.log("Summary:", report.summary);
