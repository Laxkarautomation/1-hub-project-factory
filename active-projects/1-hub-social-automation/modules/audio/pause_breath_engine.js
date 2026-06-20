function clamp(value, min, max) {
  const n = Number(value || 0);
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sentenceCount(text = "") {
  const parts = String(text || "")
    .split(/[.!?।]+/)
    .map(x => x.trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

const EMOTION_PAUSE_RULES = {
  fear_suspense: {
    basePauseMs: 620,
    breathStyle: "slow_controlled",
    deliveryPattern: "suspense_build"
  },
  mystery_curiosity: {
    basePauseMs: 560,
    breathStyle: "curious_hold",
    deliveryPattern: "question_hook"
  },
  investigation: {
    basePauseMs: 360,
    breathStyle: "steady_clear",
    deliveryPattern: "documentary_explain"
  },
  shock_reveal: {
    basePauseMs: 720,
    breathStyle: "dramatic_hold",
    deliveryPattern: "reveal_emphasis"
  },
  danger_tension: {
    basePauseMs: 520,
    breathStyle: "tense_short",
    deliveryPattern: "urgent_tension"
  },
  cta_curiosity: {
    basePauseMs: 220,
    breathStyle: "quick_invite",
    deliveryPattern: "fast_question"
  },
  neutral_documentary: {
    basePauseMs: 300,
    breathStyle: "neutral",
    deliveryPattern: "steady"
  }
};

const PACE_PAUSE_MULTIPLIER = {
  slow: 1.18,
  medium_slow: 1.08,
  slow_medium: 1.12,
  medium: 1.0,
  medium_fast: 0.82,
  fast: 0.72
};

function buildScenePausePlan(scene = {}, emotionCue = {}, pacingItem = {}) {
  const emotion = emotionCue.primary_emotion || "neutral_documentary";
  const rule = EMOTION_PAUSE_RULES[emotion] || EMOTION_PAUSE_RULES.neutral_documentary;
  const pace = pacingItem.pace || "medium";
  const paceMultiplier = PACE_PAUSE_MULTIPLIER[pace] || 1;

  const intensity = Number(emotionCue.emotion_intensity || 55);
  const intensityMultiplier = 1 + ((intensity - 60) / 200);

  const pauseMs = clamp(
    rule.basePauseMs * paceMultiplier * intensityMultiplier,
    150,
    900
  );

  const sentences = sentenceCount(scene.narration || "");
  const breathPoints = Math.max(1, Math.min(3, sentences));

  const pauseTotalMs = pauseMs * breathPoints;

  return {
    scene: scene.scene,
    segment: pacingItem.segment || emotionCue.segment || "unknown",
    narration: scene.narration || "",
    primary_emotion: emotion,
    emotion_intensity: intensity,
    pace,
    pause_ms_each: pauseMs,
    breath_points: breathPoints,
    total_pause_ms: pauseTotalMs,
    breath_style: rule.breathStyle,
    delivery_pattern: rule.deliveryPattern,
    tts_instruction: "insert_" + pauseMs + "ms_pause_at_natural_breaks",
    status: "pause_breath_plan_resolved"
  };
}

function buildPauseBreathReportForScript(script = {}, emotionReport = {}, pacingReport = {}) {
  const scenes = script.scenes || [];
  const cues = emotionReport.cues || [];
  const pacing = pacingReport.pacing || [];

  const plans = scenes.map(scene => {
    const cue = cues.find(x => x.scene === scene.scene) || {};
    const pacingItem = pacing.find(x => x.scene === scene.scene) || {};
    return buildScenePausePlan(scene, cue, pacingItem);
  });

  const totalPauseMs = plans.reduce((sum, x) => sum + x.total_pause_ms, 0);
  const averagePauseMs = plans.length
    ? Math.round(plans.reduce((sum, x) => sum + x.pause_ms_each, 0) / plans.length)
    : 0;

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    summary: {
      total_scenes: plans.length,
      total_pause_ms: totalPauseMs,
      total_pause_seconds: Number((totalPauseMs / 1000).toFixed(2)),
      average_pause_ms: averagePauseMs,
      status: "pause_breath_plan_resolved"
    },
    plans
  };
}

function buildPauseBreathBatchReport(scripts = [], emotionBatch = {}, pacingBatch = {}) {
  const emotionReports = emotionBatch.reports || [];
  const pacingReports = pacingBatch.reports || [];

  const reports = scripts.map(script => {
    const scriptId = script.script_id || script.scriptId;
    const emotion = emotionReports.find(x => x.script_id === scriptId) || {};
    const pacing = pacingReports.find(x => x.script_id === scriptId) || {};
    return buildPauseBreathReportForScript(script, emotion, pacing);
  });

  return {
    generated_at: new Date().toISOString(),
    total_scripts: reports.length,
    status: "pause_breath_batch_resolved",
    reports
  };
}

module.exports = {
  EMOTION_PAUSE_RULES,
  PACE_PAUSE_MULTIPLIER,
  sentenceCount,
  buildScenePausePlan,
  buildPauseBreathReportForScript,
  buildPauseBreathBatchReport
};
