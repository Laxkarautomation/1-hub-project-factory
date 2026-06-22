const { buildVisualContext } = require("./visual_context_builder");

function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function sentence(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : text + ".";
}

function parseSecondRange(range = "", fallbackIndex = 0) {
  const match = cleanText(range).match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) {
    const start = fallbackIndex * 4;
    return {
      time: `${start}-${start + 4}`,
      start_second: start,
      end_second: start + 4,
      duration_seconds: 4
    };
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  const duration = Math.max(1, end - start);

  return {
    time: `${start}-${end}`,
    start_second: start,
    end_second: end,
    duration_seconds: duration
  };
}

function shotPlanForBeat(beat = "") {
  const plans = {
    hook: {
      shot_type: "opening hook frame",
      composition: "tight cinematic opener with one clear subject",
      retention_role: "stop scroll"
    },
    context: {
      shot_type: "establishing context shot",
      composition: "wide-to-medium scene that sets place and stakes",
      retention_role: "orient viewer"
    },
    complication: {
      shot_type: "tension detail shot",
      composition: "medium close-up of the first visible problem",
      retention_role: "raise concern"
    },
    evidence: {
      shot_type: "evidence insert shot",
      composition: "close-up of records, objects, or visual proof without readable text",
      retention_role: "make claim concrete"
    },
    escalation: {
      shot_type: "pressure-building shot",
      composition: "dynamic documentary frame with increasing visual tension",
      retention_role: "increase pace"
    },
    reveal: {
      shot_type: "reveal contrast shot",
      composition: "before-after style contrast without literal text overlays",
      retention_role: "deliver turn"
    },
    lesson: {
      shot_type: "final takeaway shot",
      composition: "clean closing frame with subject and consequence visible",
      retention_role: "memory anchor"
    }
  };

  return plans[beat] || {
    shot_type: "documentary support shot",
    composition: "clear realistic documentary frame",
    retention_role: "support narration"
  };
}

function pickEvidenceObject(visualContext = {}, beat = "") {
  const evidenceObjects = toArray(visualContext.evidence?.evidence_objects);
  if (beat === "evidence" && evidenceObjects.length) return evidenceObjects[0];

  const motifs = toArray(visualContext.continuity?.recurring_visual_motifs);
  return motifs[0] || visualContext.subject_anchor || "documentary subject";
}

function buildNarrationCue(narration = "") {
  const text = cleanText(narration)
    .replace(/[.!?…]+$/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 10)
    .join(" ");

  return text || "story moment";
}

function buildImagePrompt(beat = {}, visualContext = {}) {
  const plan = shotPlanForBeat(beat.beat);
  const evidenceObject = pickEvidenceObject(visualContext, beat.beat);
  const negative = toArray(visualContext.safety?.negative_prompt_hints).join(", ");
  const style = cleanText(visualContext.visual_style || "documentary realism");
  const subject = cleanText(visualContext.subject_anchor || visualContext.topic);
  const visualIntent = cleanText(beat.visual_intent || plan.composition);
  const narrationCue = buildNarrationCue(beat.narration);

  return [
    plan.shot_type,
    subject,
    evidenceObject,
    visualIntent,
    `narration cue: ${narrationCue}`,
    plan.composition,
    style,
    visualContext.aspect_ratio || "vertical 9:16",
    "photorealistic documentary frame",
    negative
  ].filter(Boolean).join(", ");
}

function buildScene(beat = {}, visualContext = {}, index = 0) {
  const timing = parseSecondRange(beat.second_range, index);
  const plan = shotPlanForBeat(beat.beat);

  return {
    scene: index + 1,
    beat: cleanText(beat.beat || `scene_${index + 1}`),
    time: timing.time,
    start_second: timing.start_second,
    end_second: timing.end_second,
    duration_seconds: timing.duration_seconds,
    narration: sentence(beat.narration),
    visual_intent: cleanText(beat.visual_intent || plan.composition),
    shot_type: plan.shot_type,
    composition: plan.composition,
    retention_role: plan.retention_role,
    continuity_anchor: cleanText(visualContext.continuity?.subject_lock || visualContext.subject_anchor),
    image_prompt: buildImagePrompt(beat, visualContext)
  };
}

function scoreStoryboard(scenes = [], visualContext = {}) {
  const hasSceneNarrationAlignment = scenes.every(scene => {
    const prompt = scene.image_prompt.toLowerCase();
    const beat = scene.beat.toLowerCase();
    const subject = cleanText(visualContext.subject_anchor).toLowerCase();
    return prompt.includes(beat) || prompt.includes(subject) || prompt.includes(scene.shot_type.toLowerCase());
  });

  const hasContinuityAnchor = scenes.every(scene =>
    cleanText(scene.continuity_anchor) &&
    scene.image_prompt.toLowerCase().includes(cleanText(scene.continuity_anchor).toLowerCase())
  );

  const hasDocumentaryConstraints = scenes.every(scene =>
    /documentary|photorealistic/i.test(scene.image_prompt) &&
    /no watermark/i.test(scene.image_prompt)
  );

  let score = 100;
  if (!hasSceneNarrationAlignment) score -= 25;
  if (!hasContinuityAnchor) score -= 20;
  if (!hasDocumentaryConstraints) score -= 15;
  if (!scenes.length) score = 0;

  return {
    score,
    has_scene_narration_alignment: hasSceneNarrationAlignment,
    has_continuity_anchor: hasContinuityAnchor,
    has_documentary_constraints: hasDocumentaryConstraints,
    scene_count: scenes.length
  };
}

function buildStoryboard(brief = {}, visualContext = null) {
  const context = visualContext || buildVisualContext(brief);
  const beats = toArray(brief.documentary_script?.scene_beats);

  if (!beats.length) {
    return {
      version: "phase_27a_storyboard_intelligence",
      status: "missing_documentary_scene_beats",
      script_id: brief.script_id || brief.scriptId || brief.id || "",
      topic: cleanText(brief.topic || context.topic),
      scenes: [],
      visual_context: context,
      visual_quality: scoreStoryboard([], context)
    };
  }

  const scenes = beats.map((beat, index) => buildScene(beat, context, index));

  return {
    version: "phase_27a_storyboard_intelligence",
    status: "storyboard_ready",
    script_id: brief.script_id || brief.scriptId || brief.id || "",
    topic: cleanText(brief.topic || context.topic),
    working_title: cleanText(brief.working_title || context.working_title),
    script_source: context.script_source,
    documentary_mode: context.documentary_mode,
    scenes,
    visual_context: context,
    visual_quality: scoreStoryboard(scenes, context)
  };
}

module.exports = {
  buildStoryboard,
  buildScene,
  parseSecondRange,
  scoreStoryboard
};
