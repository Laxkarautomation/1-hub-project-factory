function clampScore(value = 0) {
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
