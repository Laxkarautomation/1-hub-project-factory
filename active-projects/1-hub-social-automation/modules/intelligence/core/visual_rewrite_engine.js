const { scoreSceneContinuity, detectDuplicateScenes } = require("./scene_continuity_engine");
const { scoreImageRelevance } = require("./image_relevance_scorer");

function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function uniqueReasons(reasons = []) {
  return [...new Set(reasons.map(cleanText).filter(Boolean))];
}

function detectWeakScenes(storyboard = {}) {
  const scenes = toArray(storyboard.scenes);
  const continuity = scoreSceneContinuity(storyboard);
  const relevance = scoreImageRelevance(storyboard);
  const duplicateScenes = detectDuplicateScenes(scenes);
  const duplicateByScene = new Map(duplicateScenes.map(item => [item.scene, item]));
  const relevanceByScene = new Map(relevance.scene_scores.map(item => [item.scene, item]));
  const visualContext = storyboard.visual_context || {};
  const anchor = cleanText(visualContext.subject_anchor).toLowerCase();
  const weak = [];

  scenes.forEach(scene => {
    const reasons = [];
    const prompt = cleanText(scene.image_prompt).toLowerCase();
    const sceneRelevance = relevanceByScene.get(scene.scene);

    if (sceneRelevance?.is_weak) reasons.push("low_relevance");
    if (!cleanText(scene.continuity_anchor) || (anchor && !prompt.includes(anchor))) {
      reasons.push("missing_continuity_anchor");
    }
    if (duplicateByScene.has(scene.scene)) reasons.push("duplicate_scene_prompt");
    if (!/documentary|photorealistic|realistic/i.test(scene.image_prompt || "")) {
      reasons.push("missing_documentary_visual_language");
    }
    if (!/vertical 9:16|9:16/i.test(scene.image_prompt || "")) {
      reasons.push("missing_vertical_format");
    }

    if (reasons.length) {
      weak.push({
        scene: scene.scene,
        beat: scene.beat,
        score: sceneRelevance?.score || 0,
        reasons: uniqueReasons(reasons),
        duplicate_of_scene: duplicateByScene.get(scene.scene)?.duplicate_of_scene || null
      });
    }
  });

  return weak.map(item => ({
    ...item,
    continuity_score: continuity.score
  }));
}

function recommendedPromptForScene(scene = {}, storyboard = {}, options = {}) {
  const visualContext = storyboard.visual_context || {};
  const channel = options.channel || visualContext.channel || {};
  const subject = cleanText(visualContext.subject_anchor || storyboard.topic || scene.continuity_anchor);
  const style = cleanText(channel.visualStyle || visualContext.visual_style || "channel-defined documentary visuals");
  const evidenceObject = toArray(visualContext.evidence?.evidence_objects)[0] || "key records";
  const beat = cleanText(scene.beat || "story moment");
  const intent = cleanText(scene.visual_intent || scene.composition || "clear documentary composition");
  const narration = cleanText(scene.narration).replace(/[.!?…]+$/g, "");

  return [
    `${beat} documentary scene`,
    subject,
    evidenceObject,
    intent,
    narration ? `visual cue from narration: ${narration}` : "",
    style,
    "vertical 9:16",
    "photorealistic documentary frame",
    "no readable text",
    "no watermark",
    "no gore"
  ].filter(Boolean).join(", ");
}

function buildVisualRewriteRecommendations(storyboard = {}, options = {}) {
  const weakScenes = detectWeakScenes(storyboard);
  const sceneByNumber = new Map(toArray(storyboard.scenes).map(scene => [scene.scene, scene]));

  const recommendations = weakScenes.map(item => {
    const scene = sceneByNumber.get(item.scene) || {};
    return {
      scene: item.scene,
      beat: item.beat,
      reasons: item.reasons,
      current_prompt: scene.image_prompt || "",
      recommended_prompt: recommendedPromptForScene(scene, storyboard, options),
      action: item.reasons.includes("duplicate_scene_prompt")
        ? "rewrite_scene_with_distinct_composition"
        : "rewrite_scene_prompt"
    };
  });

  return {
    version: "phase_27b_visual_rewrite_engine",
    status: "rewrite_recommendations_ready",
    topic: storyboard.topic || storyboard.visual_context?.topic || "",
    weak_scenes: weakScenes,
    recommendations
  };
}

module.exports = {
  buildVisualRewriteRecommendations,
  detectWeakScenes,
  recommendedPromptForScene
};
