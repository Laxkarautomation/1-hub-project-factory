function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function hasBeat(scenes = [], beat = "") {
  return toArray(scenes).some(scene => cleanText(scene.beat).toLowerCase() === beat);
}

function uniqueCount(items = []) {
  return new Set(items.map(cleanText).filter(Boolean)).size;
}

function scoreVisualRetention(storyboard = {}) {
  const scenes = toArray(storyboard.scenes);
  const shotTypes = scenes.map(scene => scene.shot_type);
  const retentionRoles = scenes.map(scene => scene.retention_role);
  const hasHookVisual = hasBeat(scenes, "hook") &&
    /hook|opener|stop scroll|tight|fast/i.test([
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "hook")?.shot_type,
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "hook")?.retention_role,
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "hook")?.visual_intent
    ].join(" "));
  const hasRevealVisual = hasBeat(scenes, "reveal") &&
    /reveal|turn|contrast|palat|issue/i.test([
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "reveal")?.shot_type,
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "reveal")?.retention_role,
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "reveal")?.visual_intent,
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "reveal")?.image_prompt
    ].join(" "));
  const hasEvidenceVisual = hasBeat(scenes, "evidence") &&
    /evidence|records|document|proof|detail/i.test(
      scenes.find(scene => cleanText(scene.beat).toLowerCase() === "evidence")?.image_prompt || ""
    );
  const hasRetentionProgression =
    scenes.length >= 4 &&
    uniqueCount(shotTypes) >= Math.min(4, scenes.length) &&
    uniqueCount(retentionRoles) >= Math.min(4, scenes.length);

  let score = 100;
  if (!hasHookVisual) score -= 25;
  if (!hasEvidenceVisual) score -= 20;
  if (!hasRevealVisual) score -= 25;
  if (!hasRetentionProgression) score -= 20;
  if (!scenes.length) score = 0;

  return {
    version: "phase_27b_visual_retention",
    score: Math.max(0, score),
    has_hook_visual: hasHookVisual,
    has_evidence_visual: hasEvidenceVisual,
    has_reveal_visual: hasRevealVisual,
    has_retention_progression: hasRetentionProgression,
    shot_type_variety: uniqueCount(shotTypes),
    retention_role_variety: uniqueCount(retentionRoles),
    scene_count: scenes.length
  };
}

module.exports = {
  scoreVisualRetention
};
