const { scoreSceneContinuity } = require("./scene_continuity_engine");
const { scoreImageRelevance } = require("./image_relevance_scorer");
const { scoreVisualRetention } = require("./visual_retention_engine");

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function scoreDocumentaryConstraints(storyboard = {}) {
  const scenes = toArray(storyboard.scenes);
  const checks = scenes.map(scene => {
    const prompt = String(scene.image_prompt || "");
    return {
      scene: scene.scene,
      has_documentary_language: /documentary|photorealistic|realistic/i.test(prompt),
      has_vertical_format: /vertical 9:16|9:16/i.test(prompt),
      avoids_text_artifacts: /no readable text|text-free|without readable text/i.test(prompt),
      avoids_watermark: /no watermark/i.test(prompt)
    };
  });

  const passed = checks.reduce((sum, item) => {
    return sum +
      Number(item.has_documentary_language) +
      Number(item.has_vertical_format) +
      Number(item.avoids_text_artifacts) +
      Number(item.avoids_watermark);
  }, 0);
  const possible = checks.length * 4;

  return {
    score: possible ? Math.round((passed / possible) * 100) : 0,
    scene_checks: checks,
    has_documentary_constraints: checks.length > 0 && checks.every(item =>
      item.has_documentary_language &&
      item.has_vertical_format &&
      item.avoids_text_artifacts &&
      item.avoids_watermark
    )
  };
}

function planDocumentaryVisualQuality(storyboard = {}, options = {}) {
  const sceneContinuity = scoreSceneContinuity(storyboard);
  const imageRelevance = scoreImageRelevance(storyboard);
  const visualRetention = scoreVisualRetention(storyboard);
  const documentaryConstraints = scoreDocumentaryConstraints(storyboard);

  const documentaryVisualQualityScore = Math.round(
    sceneContinuity.score * 0.25 +
    imageRelevance.score * 0.35 +
    visualRetention.score * 0.25 +
    documentaryConstraints.score * 0.15
  );

  return {
    version: "phase_27b_documentary_visual_planner",
    status: "visual_quality_ready",
    channelId: options.channel?.channelId || storyboard.visual_context?.channel?.channelId || "active_channel",
    topic: storyboard.topic || storyboard.visual_context?.topic || "",
    documentary_visual_quality_score: documentaryVisualQualityScore,
    scene_continuity: sceneContinuity,
    image_relevance: imageRelevance,
    visual_retention: visualRetention,
    documentary_constraints: documentaryConstraints,
    quality_band:
      documentaryVisualQualityScore >= 85 ? "strong" :
        documentaryVisualQualityScore >= 70 ? "needs_review" :
          "weak"
  };
}

module.exports = {
  planDocumentaryVisualQuality,
  scoreDocumentaryConstraints
};
