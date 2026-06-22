function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function normalizePrompt(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/\bnarration cue:\s*[^,]+/g, "")
    .replace(/\bscene\s+\d+\b/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectDuplicateScenes(scenes = []) {
  const seen = new Map();
  const duplicates = [];

  toArray(scenes).forEach(scene => {
    const key = normalizePrompt(scene.image_prompt);
    if (!key) return;

    if (seen.has(key)) {
      duplicates.push({
        scene: scene.scene,
        duplicate_of_scene: seen.get(key),
        reason: "duplicate_image_prompt"
      });
      return;
    }

    seen.set(key, scene.scene);
  });

  return duplicates;
}

function countScenesWithAnchor(scenes = [], anchor = "") {
  const cleanAnchor = cleanText(anchor).toLowerCase();
  if (!cleanAnchor) return 0;

  return toArray(scenes).filter(scene => {
    const prompt = cleanText(scene.image_prompt).toLowerCase();
    const sceneAnchor = cleanText(scene.continuity_anchor).toLowerCase();
    return sceneAnchor === cleanAnchor && prompt.includes(cleanAnchor);
  }).length;
}

function countScenesWithStyle(scenes = [], visualStyle = "") {
  const styleWords = cleanText(visualStyle)
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4);

  if (!styleWords.length) return 0;

  return toArray(scenes).filter(scene => {
    const prompt = cleanText(scene.image_prompt).toLowerCase();
    return styleWords.some(word => prompt.includes(word));
  }).length;
}

function scoreSceneContinuity(storyboard = {}) {
  const scenes = toArray(storyboard.scenes);
  const visualContext = storyboard.visual_context || {};
  const anchor = cleanText(visualContext.continuity?.subject_lock || visualContext.subject_anchor);
  const visualStyle = cleanText(visualContext.visual_style || visualContext.continuity?.style_lock);
  const duplicates = detectDuplicateScenes(scenes);

  const anchorMatches = countScenesWithAnchor(scenes, anchor);
  const styleMatches = countScenesWithStyle(scenes, visualStyle);
  const hasContinuityAnchor = scenes.length > 0 && anchorMatches === scenes.length;
  const hasStyleLock = scenes.length > 0 && styleMatches === scenes.length;
  const duplicatePenalty = Math.min(35, duplicates.length * 18);
  const anchorPenalty = scenes.length ? Math.round(((scenes.length - anchorMatches) / scenes.length) * 30) : 40;
  const stylePenalty = scenes.length ? Math.round(((scenes.length - styleMatches) / scenes.length) * 20) : 30;

  const score = Math.max(0, 100 - duplicatePenalty - anchorPenalty - stylePenalty);

  return {
    version: "phase_27b_scene_continuity",
    score,
    has_continuity_anchor: hasContinuityAnchor,
    has_style_lock: hasStyleLock,
    anchor_match_count: anchorMatches,
    style_match_count: styleMatches,
    duplicate_scenes: duplicates,
    scene_count: scenes.length
  };
}

module.exports = {
  scoreSceneContinuity,
  detectDuplicateScenes,
  normalizePrompt
};
