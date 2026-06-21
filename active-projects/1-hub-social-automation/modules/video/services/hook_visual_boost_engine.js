function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function clampScore(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function wordCount(value = "") {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function containsAny(text = "", terms = []) {
  const normalized = String(text || "").toLowerCase();
  return terms.some(term => normalized.includes(term));
}

function findPlan(report = {}, scriptId) {
  return toArray(report.plans).find(plan => plan.script_id === scriptId) || {};
}

function findScene(plan = {}, sceneNumber) {
  return toArray(plan.scenes).find(scene => Number(scene.scene) === Number(sceneNumber)) || {};
}

function findOutgoingTransition(plan = {}, sceneNumber) {
  return toArray(plan.transitions).find(item => Number(item.from_scene) === Number(sceneNumber)) || {};
}

function scoreVisualIntensity(hookScene = {}, hookMotion = {}, hookTransition = {}) {
  const prompt = hookScene.image_prompt || "";
  let score = 45;

  if (containsAny(prompt, ["dark", "dramatic", "shadow", "fog", "cinematic"])) score += 18;
  if (containsAny(prompt, ["close-up", "close up", "wide shot", "empty", "abandoned"])) score += 10;
  if (containsAny(prompt, ["high detail", "moody", "suspense", "eerie"])) score += 10;
  if (hookMotion.camera_move === "push_in") score += 8;
  if (hookTransition.transition_type === "hard_cut") score += 6;

  return clampScore(score);
}

function scoreRevealTease(hookScene = {}) {
  const text = `${hookScene.narration || ""} ${hookScene.image_prompt || ""}`;
  let score = 35;

  if (containsAny(text, ["mystery", "strange", "hidden", "secret", "sach", "truth"])) score += 18;
  if (containsAny(text, ["empty", "abandoned", "silent", "khaali", "darr", "fear"])) score += 16;
  if (containsAny(text, ["after sunset", "raat", "night", "suraj dhalne"])) score += 12;
  if (wordCount(hookScene.narration) >= 8) score += 8;

  return clampScore(score);
}

function buildBoost(enabled, level, reason) {
  return { enabled, level, reason };
}

function hookStatus(score = 0) {
  if (score >= 75) return "strong_hook";
  if (score >= 55) return "average_hook";
  return "weak_hook";
}

function buildHookVisualBoostForVideo(video = {}, motionReport = {}, transitionReport = {}) {
  const scriptId = video.script_id || video.scriptId;
  const hookScene = toArray(video.scenes)[0] || {};
  const motionPlan = findPlan(motionReport, scriptId);
  const transitionPlan = findPlan(transitionReport, scriptId);
  const hookMotion = findScene(motionPlan, hookScene.scene || 1);
  const hookTransition = findOutgoingTransition(transitionPlan, hookScene.scene || 1);

  const visualIntensityScore = scoreVisualIntensity(hookScene, hookMotion, hookTransition);
  const revealTeaseScore = scoreRevealTease(hookScene);
  const hookWords = wordCount(hookScene.narration);
  const motionBonus = hookMotion.motion_type === "slow_zoom_in_push_in" ? 8 : 0;
  const transitionBonus = hookTransition.transition_type === "hard_cut" ? 5 : 0;
  const hookStrengthScore = clampScore(
    visualIntensityScore * 0.45 +
    revealTeaseScore * 0.35 +
    Math.min(100, hookWords * 7) * 0.20 +
    motionBonus +
    transitionBonus
  );

  return {
    script_id: scriptId,
    hook_scene: hookScene.scene || 1,
    hook_duration_seconds: hookScene.duration_seconds || null,
    visual_intensity_score: visualIntensityScore,
    hook_strength_score: hookStrengthScore,
    camera_motion_boost: buildBoost(
      true,
      hookStrengthScore >= 75 ? "moderate" : "high",
      "increase first-frame depth with a stronger push-in"
    ),
    contrast_boost: buildBoost(
      true,
      visualIntensityScore >= 75 ? "moderate" : "high",
      "raise contrast around the main subject for faster visual read"
    ),
    zoom_boost: buildBoost(
      true,
      hookStrengthScore >= 75 ? "moderate" : "high",
      "tighten the opening frame during the first seconds"
    ),
    text_overlay_boost: buildBoost(
      hookWords >= 6,
      hookStrengthScore >= 75 ? "light" : "moderate",
      "add a short curiosity phrase without covering the subject"
    ),
    reveal_tease_score: revealTeaseScore,
    status: hookStatus(hookStrengthScore)
  };
}

function buildHookVisualBoostBatch(manifest = [], motionReport = {}, transitionReport = {}) {
  const hooks = toArray(manifest).map(video =>
    buildHookVisualBoostForVideo(video, motionReport, transitionReport)
  );
  const averageHookStrength = hooks.length
    ? clampScore(hooks.reduce((sum, item) => sum + item.hook_strength_score, 0) / hooks.length)
    : 0;

  return {
    generated_at: new Date().toISOString(),
    total_scripts: hooks.length,
    summary: {
      total_hooks: hooks.length,
      weak_hooks: hooks.filter(item => item.status === "weak_hook").length,
      average_hooks: hooks.filter(item => item.status === "average_hook").length,
      strong_hooks: hooks.filter(item => item.status === "strong_hook").length,
      average_hook_strength_score: averageHookStrength,
      status: hooks.length > 0 ? "hook_visual_boost_batch_ready" : "hook_visual_boost_batch_empty"
    },
    hooks
  };
}

module.exports = {
  buildHookVisualBoostBatch,
  buildHookVisualBoostForVideo,
  hookStatus,
  scoreRevealTease,
  scoreVisualIntensity
};
