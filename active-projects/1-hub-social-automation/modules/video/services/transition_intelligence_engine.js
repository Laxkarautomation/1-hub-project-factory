function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

const TRANSITION_RULES = {
  "hook:context": {
    transition_type: "hard_cut",
    duration_ms: 120,
    intensity: "sharp",
    reason: "move quickly from the hook into context without losing attention"
  },
  "context:evidence": {
    transition_type: "soft_dissolve",
    duration_ms: 450,
    intensity: "gentle",
    reason: "soften the shift from setup into supporting detail"
  },
  "evidence:evidence": {
    transition_type: "zoom_blend",
    duration_ms: 520,
    intensity: "medium",
    reason: "connect related evidence beats while preserving momentum"
  },
  "evidence:reveal": {
    transition_type: "impact_flash",
    duration_ms: 180,
    intensity: "high",
    reason: "punctuate the turn from evidence into the reveal"
  },
  "reveal:cta": {
    transition_type: "smooth_fade",
    duration_ms: 650,
    intensity: "calm",
    reason: "settle the reveal before the call to action"
  }
};

const DEFAULT_TRANSITION = {
  transition_type: "soft_dissolve",
  duration_ms: 400,
  intensity: "balanced",
  reason: "use a neutral transition for unspecified story-flow pairs"
};

function normalizeSegment(value = "") {
  const segment = String(value || "").toLowerCase().trim();
  if (["hook", "context", "evidence", "reveal", "cta"].includes(segment)) {
    return segment;
  }
  if (segment === "complication" || segment === "escalation") return "evidence";
  if (segment === "lesson" || segment === "ending") return "cta";
  return "";
}

function detectSegment(scene = {}, index = 0, totalScenes = 1) {
  const explicit = normalizeSegment(scene.segment || scene.beat || scene.retention_role);
  if (explicit) return explicit;

  const sceneNo = Number(scene.scene || index + 1);
  if (sceneNo === 1 || index === 0) return "hook";
  if (sceneNo === totalScenes || index === totalScenes - 1) return "cta";
  if (sceneNo === totalScenes - 1 || index === totalScenes - 2) return "reveal";
  if (sceneNo === 2 || index === 1) return "context";
  return "evidence";
}

function selectTransition(fromSegment, toSegment) {
  const key = `${fromSegment}:${toSegment}`;
  return {
    ...(TRANSITION_RULES[key] || DEFAULT_TRANSITION),
    from_segment: fromSegment,
    to_segment: toSegment
  };
}

function buildTransition(scene = {}, nextScene = {}, index = 0, totalScenes = 1) {
  const fromSegment = detectSegment(scene, index, totalScenes);
  const toSegment = detectSegment(nextScene, index + 1, totalScenes);
  const transition = selectTransition(fromSegment, toSegment);

  return {
    from_scene: scene.scene || index + 1,
    to_scene: nextScene.scene || index + 2,
    from_segment: transition.from_segment,
    to_segment: transition.to_segment,
    transition_type: transition.transition_type,
    duration_ms: transition.duration_ms,
    intensity: transition.intensity,
    reason: transition.reason
  };
}

function buildTransitionsForVideo(video = {}) {
  const scenes = toArray(video.scenes);
  const transitions = scenes.slice(0, -1).map((scene, index) =>
    buildTransition(scene, scenes[index + 1], index, scenes.length)
  );

  return {
    script_id: video.script_id || video.scriptId,
    title: video.title || null,
    total_scenes: scenes.length,
    total_transitions: transitions.length,
    status: "transition_intelligence_ready",
    transitions
  };
}

function buildTransitionIntelligenceBatch(manifest = [], manifestSource = "unknown") {
  const plans = toArray(manifest).map(buildTransitionsForVideo);
  const totalTransitions = plans.reduce((sum, plan) => sum + plan.total_transitions, 0);

  return {
    generated_at: new Date().toISOString(),
    manifest_source: manifestSource,
    total_scripts: plans.length,
    summary: {
      total_transitions: totalTransitions,
      status: plans.length > 0
        ? "transition_intelligence_batch_ready"
        : "transition_intelligence_batch_empty"
    },
    plans
  };
}

module.exports = {
  TRANSITION_RULES,
  buildTransition,
  buildTransitionIntelligenceBatch,
  buildTransitionsForVideo,
  detectSegment,
  selectTransition
};
