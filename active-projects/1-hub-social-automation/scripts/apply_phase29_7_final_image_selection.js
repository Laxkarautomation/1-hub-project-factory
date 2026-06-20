const fs = require("fs");
const path = require("path");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

write("modules/image-factory/services/final_image_selection_engine.js", `function clampScore(value = 0) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function selectFinalImageForScene(decision = {}) {
  const readiness = clampScore(decision.final_image_readiness_score);
  const approved = decision.decision === "approve" && readiness >= 70;

  return {
    script_id: decision.script_id,
    scene: decision.scene,
    selected_image_path: decision.image_path || "",
    quality_score: clampScore(decision.quality_score),
    match_score: clampScore(decision.match_score),
    continuity_score: clampScore(decision.continuity_score),
    final_image_readiness_score: readiness,
    approved_for_video: approved,
    selection_status: approved ? "selected_for_video" : "blocked_from_video",
    block_reasons: approved ? [] : (decision.reasons || ["not_approved_by_regeneration_engine"])
  };
}

function buildFinalImageSelectionReport({
  scriptId,
  regenerationReport = {}
}) {
  const decisions = regenerationReport.decisions || [];
  const selections = decisions.map(selectFinalImageForScene);

  const approved = selections.filter(x => x.approved_for_video).length;
  const blocked = selections.length - approved;

  const averageScore = selections.length
    ? clampScore(selections.reduce((sum, x) => sum + x.final_image_readiness_score, 0) / selections.length)
    : 0;

  return {
    generated_at: new Date().toISOString(),
    script_id: scriptId,
    summary: {
      total_scenes: selections.length,
      approved_for_video: approved,
      blocked_from_video: blocked,
      average_final_image_score: averageScore,
      status: blocked === 0 ? "final_images_selected" : "final_image_selection_blocked"
    },
    selections
  };
}

module.exports = {
  clampScore,
  selectFinalImageForScene,
  buildFinalImageSelectionReport
};
`);

write("modules/image-factory/run_final_image_selection.js", `const fs = require("fs");
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
`);
