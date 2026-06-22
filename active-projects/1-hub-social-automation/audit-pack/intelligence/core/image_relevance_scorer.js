function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into",
  "aur", "tha", "thi", "hai", "me", "mein", "ka", "ki", "ke", "ko",
  "ek", "ye", "yahin", "real", "main", "ban", "gaya", "gayi", "sakta"
]);

function tokens(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function uniqueTokens(value = "") {
  return [...new Set(tokens(value))];
}

function overlapScore(source = "", target = "") {
  const sourceTokens = uniqueTokens(source);
  const targetTokens = new Set(uniqueTokens(target));

  if (!sourceTokens.length) return 0;

  const matches = sourceTokens.filter(token => targetTokens.has(token)).length;
  return Math.round((matches / sourceTokens.length) * 100);
}

function scoreSceneRelevance(scene = {}, visualContext = {}) {
  const prompt = cleanText(scene.image_prompt);
  const narration = cleanText(scene.narration);
  const subject = cleanText(visualContext.subject_anchor || visualContext.topic);
  const evidenceObjects = toArray(visualContext.evidence?.evidence_objects).join(" ");
  const beat = cleanText(scene.beat);
  const visualIntent = cleanText(scene.visual_intent);

  const narrationScore = overlapScore(narration, prompt);
  const subjectScore = subject && prompt.toLowerCase().includes(subject.toLowerCase()) ? 100 : overlapScore(subject, prompt);
  const intentScore = overlapScore([beat, visualIntent, evidenceObjects].join(" "), prompt);
  const documentaryScore = /documentary|photorealistic|records|evidence|context|reveal|closing|opener/i.test(prompt) ? 100 : 45;

  const score = Math.round(
    narrationScore * 0.35 +
    subjectScore * 0.3 +
    intentScore * 0.25 +
    documentaryScore * 0.1
  );

  return {
    scene: scene.scene,
    beat,
    score,
    narration_overlap_score: narrationScore,
    subject_score: subjectScore,
    intent_score: intentScore,
    documentary_score: documentaryScore,
    is_weak: score < 70
  };
}

function scoreImageRelevance(storyboard = {}) {
  const scenes = toArray(storyboard.scenes);
  const visualContext = storyboard.visual_context || {};
  const scene_scores = scenes.map(scene => scoreSceneRelevance(scene, visualContext));
  const weakScenes = scene_scores
    .filter(item => item.is_weak)
    .map(item => ({
      scene: item.scene,
      beat: item.beat,
      score: item.score,
      reason: "low_narration_to_image_relevance"
    }));
  const average = scene_scores.length
    ? Math.round(scene_scores.reduce((sum, item) => sum + item.score, 0) / scene_scores.length)
    : 0;

  return {
    version: "phase_27b_image_relevance",
    score: average,
    has_narration_alignment: weakScenes.length === 0 && scene_scores.length > 0,
    weak_scenes: weakScenes,
    scene_scores
  };
}

module.exports = {
  scoreImageRelevance,
  scoreSceneRelevance,
  overlapScore,
  tokens
};
