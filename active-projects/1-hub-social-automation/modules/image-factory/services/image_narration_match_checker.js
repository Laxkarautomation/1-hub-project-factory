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

const INTENT_GROUPS = [
  {
    id: "location",
    narration: ["gaon", "village", "jagah", "place", "lane", "gali", "road", "site", "mountain", "forest"],
    prompt: ["village", "rural", "lane", "road", "site", "mountain", "forest", "location", "place"]
  },
  {
    id: "fear_mystery",
    narration: ["darte", "fear", "mystery", "secret", "hidden", "raaz", "truth", "shocking", "alag"],
    prompt: ["dark", "eerie", "haunted", "suspense", "mystery", "shadow", "fog", "moonlight", "dramatic"]
  },
  {
    id: "people",
    narration: ["log", "people", "survivors", "villagers", "public"],
    prompt: ["people", "villagers", "survivors", "faces", "standing", "crowd"]
  },
  {
    id: "evidence",
    narration: ["facts", "details", "records", "case", "available", "stories"],
    prompt: ["documentary", "realistic", "evidence", "details", "records", "case", "clue"]
  },
  {
    id: "danger",
    narration: ["accident", "crash", "bachne", "survival", "emergency", "damage"],
    prompt: ["crash", "accident", "damaged", "broken", "survival", "emergency", "rescue"]
  },
  {
    id: "ending_question",
    narration: ["kya lagta", "sach", "truth", "comment", "batao", "hidden"],
    prompt: ["lonely", "ending", "moonlight", "final", "reveal", "truth", "suspense"]
  }
];

function detectIntentMatches(narration = "", prompt = "") {
  return INTENT_GROUPS.map(group => {
    const narrationHit = hasAny(narration, group.narration);
    const promptHit = hasAny(prompt, group.prompt);

    return {
      id: group.id,
      narration_hit: narrationHit,
      prompt_hit: promptHit,
      matched: narrationHit && promptHit
    };
  });
}

function intentAlignmentScore(narration = "", prompt = "") {
  const matches = detectIntentMatches(narration, prompt);
  const narrationIntents = matches.filter(x => x.narration_hit);

  if (!narrationIntents.length) return 70;

  const matched = narrationIntents.filter(x => x.matched).length;
  return Math.round((matched / narrationIntents.length) * 100);
}

function visualSafetyScore(prompt = "") {
  const value = cleanText(prompt);
  const required = ["no text", "no watermark", "no gore"];
  const hits = required.filter(x => value.includes(x)).length;
  return Math.round((hits / required.length) * 100);
}

function visualSpecificityScore(prompt = "") {
  const words = cleanText(prompt).split(" ").filter(Boolean);
  if (words.length >= 18) return 100;
  if (words.length >= 12) return 85;
  if (words.length >= 8) return 70;
  return 50;
}

function documentaryStyleScore(prompt = "") {
  return hasAny(prompt, ["cinematic", "realistic", "documentary", "moody", "dramatic", "vertical 9 16"])
    ? 90
    : 60;
}

function sceneIntentScore(scene = {}) {
  const narration = scene.narration || "";
  const prompt = scene.image_prompt || scene.prompt || "";

  const intent = intentAlignmentScore(narration, prompt);
  const specificity = visualSpecificityScore(prompt);
  const safety = visualSafetyScore(prompt);
  const style = documentaryStyleScore(prompt);

  const score = Math.round(
    intent * 0.45 +
    specificity * 0.25 +
    safety * 0.15 +
    style * 0.15
  );

  return {
    scene: scene.scene,
    narration,
    image_prompt: prompt,
    intent_alignment_score: intent,
    visual_specificity_score: specificity,
    visual_safety_score: safety,
    documentary_style_score: style,
    match_score: score,
    approved: score >= 70,
    status: score >= 70 ? "match_passed" : "match_needs_rewrite",
    intent_matches: detectIntentMatches(narration, prompt)
  };
}

function checkImageNarrationMatch(script = {}) {
  const scenes = script.scenes || [];

  const results = scenes.map(sceneIntentScore);
  const average = results.length
    ? Math.round(results.reduce((sum, x) => sum + x.match_score, 0) / results.length)
    : 0;

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    total_scenes: results.length,
    approved_scenes: results.filter(x => x.approved).length,
    rejected_scenes: results.filter(x => !x.approved).length,
    average_match_score: average,
    status: results.every(x => x.approved)
      ? "image_narration_match_passed"
      : "image_narration_match_needs_review",
    scenes: results
  };
}

module.exports = {
  checkImageNarrationMatch,
  sceneIntentScore,
  intentAlignmentScore,
  visualSpecificityScore,
  visualSafetyScore,
  documentaryStyleScore
};
