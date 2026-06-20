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

const EMOTION_RULES = [
  {
    emotion: "fear_suspense",
    words: ["darr", "darte", "fear", "haunted", "andhera", "raat", "khaali", "shadow", "dark", "moonlight"],
    intensity: 82,
    cue: "slow_low_voice"
  },
  {
    emotion: "mystery_curiosity",
    words: ["mystery", "raaz", "hidden", "secret", "truth", "sach", "kya lagta", "unanswered"],
    intensity: 78,
    cue: "pause_before_keyword"
  },
  {
    emotion: "investigation",
    words: ["facts", "details", "case", "records", "available", "public theories", "evidence", "clue"],
    intensity: 70,
    cue: "clear_documentary_delivery"
  },
  {
    emotion: "shock_reveal",
    words: ["shocking", "alag", "sabse interesting", "unimaginable", "reveal", "twist"],
    intensity: 85,
    cue: "emphasize_reveal"
  },
  {
    emotion: "danger_tension",
    words: ["accident", "crash", "survival", "rescue", "bachne", "emergency", "damaged", "broken"],
    intensity: 84,
    cue: "tense_urgent_delivery"
  },
  {
    emotion: "cta_curiosity",
    words: ["comment", "batao", "aapko kya lagta", "kya lagta hai"],
    intensity: 68,
    cue: "quick_inviting_delivery"
  }
];

function detectEmotion(scene = {}) {
  const text = [
    scene.narration,
    scene.image_prompt || scene.prompt
  ].filter(Boolean).join(" ");

  const hits = EMOTION_RULES
    .filter(rule => hasAny(text, rule.words))
    .map(rule => ({
      emotion: rule.emotion,
      intensity: rule.intensity,
      cue: rule.cue
    }));

  if (!hits.length) {
    return {
      primary_emotion: "neutral_documentary",
      intensity: 55,
      cue: "steady_clear_delivery",
      matched_emotions: []
    };
  }

  const sorted = hits.sort((a, b) => b.intensity - a.intensity);
  const primary = sorted[0];

  return {
    primary_emotion: primary.emotion,
    intensity: primary.intensity,
    cue: primary.cue,
    matched_emotions: sorted
  };
}

function buildSceneEmotionCue(scene = {}, pacingItem = {}) {
  const detected = detectEmotion(scene);

  const segment = pacingItem.segment || "unknown";
  let adjustedIntensity = detected.intensity;

  if (segment === "hook") adjustedIntensity += 5;
  if (segment === "reveal") adjustedIntensity += 7;
  if (segment === "cta") adjustedIntensity = Math.min(adjustedIntensity, 72);

  adjustedIntensity = Math.max(0, Math.min(100, adjustedIntensity));

  return {
    scene: scene.scene,
    segment,
    narration: scene.narration || "",
    primary_emotion: detected.primary_emotion,
    emotion_intensity: adjustedIntensity,
    delivery_cue: detected.cue,
    matched_emotions: detected.matched_emotions,
    status: "emotion_cue_resolved"
  };
}

function buildEmotionCueReportForScript(script = {}, pacingReport = {}) {
  const scenes = script.scenes || [];
  const pacingItems = pacingReport.pacing || [];

  const cues = scenes.map(scene => {
    const pacing = pacingItems.find(x => x.scene === scene.scene) || {};
    return buildSceneEmotionCue(scene, pacing);
  });

  const averageIntensity = cues.length
    ? Math.round(cues.reduce((sum, x) => sum + x.emotion_intensity, 0) / cues.length)
    : 0;

  const emotionCounts = cues.reduce((acc, cue) => {
    acc[cue.primary_emotion] = (acc[cue.primary_emotion] || 0) + 1;
    return acc;
  }, {});

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    summary: {
      total_scenes: cues.length,
      average_emotion_intensity: averageIntensity,
      emotion_counts: emotionCounts,
      status: "emotion_cues_resolved"
    },
    cues
  };
}

function buildEmotionCueBatchReport(scripts = [], audioPacingBatch = {}) {
  const pacingReports = audioPacingBatch.reports || [];

  const reports = scripts.map(script => {
    const scriptId = script.script_id || script.scriptId;
    const pacing = pacingReports.find(x => x.script_id === scriptId) || {};
    return buildEmotionCueReportForScript(script, pacing);
  });

  return {
    generated_at: new Date().toISOString(),
    total_scripts: reports.length,
    status: "emotion_cue_batch_resolved",
    reports
  };
}

module.exports = {
  EMOTION_RULES,
  detectEmotion,
  buildSceneEmotionCue,
  buildEmotionCueReportForScript,
  buildEmotionCueBatchReport
};
