function cleanText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text = "", words = []) {
  const value = cleanText(text);
  return words.some(word => value.includes(cleanText(word)));
}

const ENVIRONMENT_GROUPS = {
  rural_village: ["village", "gaon", "rural", "lane", "gali", "temple", "road", "doorway"],
  crash_site: ["crash", "airplane", "aircraft", "wreckage", "mountain", "forest", "rescue", "snow", "mud"],
  urban_crime: ["city", "street", "apartment", "office", "police", "station", "building"],
  documentary_generic: ["documentary", "realistic", "evidence", "records", "case", "details"]
};

const MOOD_GROUPS = {
  suspense: ["dark", "eerie", "mystery", "haunted", "secret", "hidden", "shadow", "fog", "moonlight"],
  danger: ["crash", "accident", "broken", "damaged", "emergency", "survival", "rescue"],
  investigation: ["evidence", "case", "records", "details", "clue", "theory", "facts"],
  emotional: ["worried", "lonely", "fear", "darte", "public", "faces"]
};

const SUBJECT_GROUPS = {
  place: ["village", "road", "site", "path", "doorway", "temple", "lane"],
  people: ["villagers", "people", "survivors", "faces", "standing", "public", "log"],
  object_clue: ["bell", "curtain", "aircraft", "metal", "supplies", "records", "clue", "door"],
  ending_frame: ["lonely", "moonlight", "ending", "final", "truth", "reveal"]
};

function detectGroups(text = "", groups = {}) {
  return Object.entries(groups)
    .filter(([, words]) => hasAny(text, words))
    .map(([key]) => key);
}

function overlapScore(a = [], b = [], fallback = 70) {
  if (!a.length && !b.length) return fallback;
  if (!a.length || !b.length) return 55;

  const bSet = new Set(b);
  const matched = a.filter(x => bSet.has(x)).length;
  return Math.round((matched / Math.max(a.length, b.length)) * 100);
}

function sceneText(scene = {}) {
  return [
    scene.narration,
    scene.image_prompt || scene.prompt
  ].filter(Boolean).join(" ");
}

function analyzeScene(scene = {}) {
  const text = sceneText(scene);

  return {
    scene: scene.scene,
    environment_groups: detectGroups(text, ENVIRONMENT_GROUPS),
    mood_groups: detectGroups(text, MOOD_GROUPS),
    subject_groups: detectGroups(text, SUBJECT_GROUPS),
    narration: scene.narration || "",
    image_prompt: scene.image_prompt || scene.prompt || ""
  };
}

function pairContinuityScore(previous, current) {
  const environmentScore = overlapScore(
    previous.environment_groups,
    current.environment_groups,
    75
  );

  const moodScore = overlapScore(
    previous.mood_groups,
    current.mood_groups,
    75
  );

  const subjectScore = overlapScore(
    previous.subject_groups,
    current.subject_groups,
    65
  );

  const progressionScore = current.scene > previous.scene ? 100 : 40;

  const continuityScore = Math.round(
    environmentScore * 0.35 +
    moodScore * 0.30 +
    subjectScore * 0.20 +
    progressionScore * 0.15
  );

  return {
    from_scene: previous.scene,
    to_scene: current.scene,
    environment_score: environmentScore,
    mood_score: moodScore,
    subject_score: subjectScore,
    progression_score: progressionScore,
    continuity_score: continuityScore,
    status: continuityScore >= 65 ? "continuity_passed" : "continuity_needs_review"
  };
}

function wholeStoryProgressionScore(sceneAnalyses = []) {
  if (sceneAnalyses.length <= 1) return 100;

  const hasOpeningPlace = sceneAnalyses[0].subject_groups.includes("place");
  const hasMiddleClue = sceneAnalyses.slice(1, -1).some(scene =>
    scene.subject_groups.includes("object_clue") ||
    scene.mood_groups.includes("investigation")
  );
  const hasEnding = sceneAnalyses[sceneAnalyses.length - 1].subject_groups.includes("ending_frame");

  let score = 60;
  if (hasOpeningPlace) score += 15;
  if (hasMiddleClue) score += 15;
  if (hasEnding) score += 10;

  return Math.min(score, 100);
}

function checkImageContinuity(script = {}) {
  const scenes = script.scenes || [];
  const analyses = scenes.map(analyzeScene);

  const pairs = [];
  for (let i = 1; i < analyses.length; i++) {
    pairs.push(pairContinuityScore(analyses[i - 1], analyses[i]));
  }

  const pairAverage = pairs.length
    ? Math.round(pairs.reduce((sum, x) => sum + x.continuity_score, 0) / pairs.length)
    : 100;

  const storyProgression = wholeStoryProgressionScore(analyses);

  const finalScore = Math.round(pairAverage * 0.75 + storyProgression * 0.25);

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    total_scenes: scenes.length,
    pair_average_score: pairAverage,
    story_progression_score: storyProgression,
    continuity_score: finalScore,
    status: finalScore >= 65 ? "image_continuity_passed" : "image_continuity_needs_review",
    scene_analysis: analyses,
    scene_pairs: pairs
  };
}

module.exports = {
  checkImageContinuity,
  analyzeScene,
  pairContinuityScore,
  wholeStoryProgressionScore
};
