const fs = require("fs");
const path = require("path");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

write("modules/image-factory/services/image_regeneration_decision_engine.js", `function clampScore(value = 0) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function decideSceneRegeneration({
  scene,
  quality = {},
  match = {},
  continuityPairs = []
}) {
  const sceneNo = scene.scene;
  const qualityScore = clampScore(quality.quality_score);
  const matchScore = clampScore(match.match_score);

  const relatedPairs = continuityPairs.filter(pair =>
    pair.from_scene === sceneNo || pair.to_scene === sceneNo
  );

  const continuityScore = relatedPairs.length
    ? clampScore(
        relatedPairs.reduce((sum, x) => sum + clampScore(x.continuity_score), 0) / relatedPairs.length
      )
    : 80;

  const finalScore = clampScore(
    qualityScore * 0.35 +
    matchScore * 0.40 +
    continuityScore * 0.25
  );

  const reasons = [];

  if (!quality.exists) reasons.push("image_missing");
  if (qualityScore < 60) reasons.push("low_image_quality");
  if (matchScore < 65) reasons.push("narration_prompt_mismatch");
  if (continuityScore < 60) reasons.push("continuity_break");

  let decision = "approve";
  if (reasons.includes("image_missing") || qualityScore < 45 || matchScore < 45) {
    decision = "regenerate_required";
  } else if (reasons.length > 0 || finalScore < 70) {
    decision = "review_or_regenerate";
  }

  return {
    script_id: scene.script_id || quality.script_id || match.script_id,
    scene: sceneNo,
    image_path: quality.image_path || "",
    quality_score: qualityScore,
    match_score: matchScore,
    continuity_score: continuityScore,
    final_image_readiness_score: finalScore,
    decision,
    regenerate: decision !== "approve",
    reasons,
    approved: decision === "approve"
  };
}

function buildRegenerationDecisionReport({
  scriptId,
  qualityReport = [],
  matchReport = {},
  continuityReport = {}
}) {
  const matchScenes = matchReport.scenes || [];
  const continuityPairs = continuityReport.scene_pairs || [];

  const decisions = qualityReport.map(quality => {
    const match = matchScenes.find(x => x.scene === quality.scene) || {};
    return decideSceneRegeneration({
      scene: {
        script_id: scriptId,
        scene: quality.scene
      },
      quality,
      match,
      continuityPairs
    });
  });

  const approved = decisions.filter(x => x.approved).length;
  const regenerateRequired = decisions.filter(x => x.decision === "regenerate_required").length;
  const reviewOrRegenerate = decisions.filter(x => x.decision === "review_or_regenerate").length;

  const averageReadiness = decisions.length
    ? clampScore(decisions.reduce((sum, x) => sum + x.final_image_readiness_score, 0) / decisions.length)
    : 0;

  let status = "image_regeneration_not_required";
  if (regenerateRequired > 0) status = "image_regeneration_required";
  else if (reviewOrRegenerate > 0) status = "image_review_or_regeneration_recommended";

  return {
    generated_at: new Date().toISOString(),
    script_id: scriptId,
    summary: {
      total_scenes: decisions.length,
      approved,
      regenerate_required: regenerateRequired,
      review_or_regenerate: reviewOrRegenerate,
      average_readiness_score: averageReadiness,
      status
    },
    decisions
  };
}

module.exports = {
  clampScore,
  decideSceneRegeneration,
  buildRegenerationDecisionReport
};
`);

write("modules/image-factory/run_image_regeneration_decision.js", `const fs = require("fs");
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
`);
