function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function seconds(value = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.round(n));
}

const MOTION_PROFILES = {
  hook: {
    motion_type: "slow_zoom_in_push_in",
    camera_move: "push_in",
    zoom: { start_scale: 1.02, end_scale: 1.12 },
    pan: { enabled: false, direction: "center", distance_percent: 0 },
    hold: { enabled: false, start_percent: 0, end_percent: 0 },
    easing: "ease_in_out",
    intensity: "slow",
    purpose: "create immediate depth without distracting from the hook"
  },
  context: {
    motion_type: "slow_pan",
    camera_move: "pan",
    zoom: { start_scale: 1.06, end_scale: 1.06 },
    pan: { enabled: true, direction: "left_to_right", distance_percent: 8 },
    hold: { enabled: false, start_percent: 0, end_percent: 0 },
    easing: "linear",
    intensity: "slow",
    purpose: "add gentle movement while orienting the viewer"
  },
  evidence: {
    motion_type: "subtle_zoom_hold",
    camera_move: "zoom_and_hold",
    zoom: { start_scale: 1.04, end_scale: 1.08 },
    pan: { enabled: false, direction: "center", distance_percent: 0 },
    hold: { enabled: true, start_percent: 70, end_percent: 100 },
    easing: "ease_out",
    intensity: "subtle",
    purpose: "make evidence feel inspected rather than static"
  },
  reveal: {
    motion_type: "dramatic_push_in",
    camera_move: "push_in",
    zoom: { start_scale: 1.03, end_scale: 1.18 },
    pan: { enabled: false, direction: "center", distance_percent: 0 },
    hold: { enabled: false, start_percent: 0, end_percent: 0 },
    easing: "ease_in",
    intensity: "dramatic",
    purpose: "increase tension at the reveal beat"
  },
  cta: {
    motion_type: "slow_zoom_out_or_hold",
    camera_move: "zoom_out_or_hold",
    zoom: { start_scale: 1.08, end_scale: 1.02 },
    pan: { enabled: false, direction: "center", distance_percent: 0 },
    hold: { enabled: true, start_percent: 80, end_percent: 100 },
    easing: "ease_out",
    intensity: "slow",
    purpose: "settle the final frame so the call to action is readable"
  }
};

function normalizeSegment(value = "") {
  const segment = String(value || "").toLowerCase().trim();
  if (MOTION_PROFILES[segment]) return segment;
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

function buildFfmpegMotionHint(profile = {}, durationSeconds = 1) {
  const frames = Math.max(1, durationSeconds * 30);
  const zoom = profile.zoom || {};
  const start = Number(zoom.start_scale || 1);
  const end = Number(zoom.end_scale || start);
  const zoomExpr = `${start}+(${end}-${start})*on/${frames}`;

  return {
    fps: 30,
    frames,
    filter_family: "zoompan",
    zoom_expression: zoomExpr,
    output_size: "720x1280"
  };
}

function buildSceneMotionPlan(scene = {}, index = 0, totalScenes = 1) {
  const segment = detectSegment(scene, index, totalScenes);
  const profile = MOTION_PROFILES[segment] || MOTION_PROFILES.evidence;
  const durationSeconds = seconds(scene.duration_seconds);

  return {
    scene: scene.scene || index + 1,
    segment,
    duration_seconds: durationSeconds,
    motion_type: profile.motion_type,
    camera_move: profile.camera_move,
    zoom: { ...profile.zoom },
    pan: { ...profile.pan },
    hold: { ...profile.hold },
    easing: profile.easing,
    intensity: profile.intensity,
    purpose: profile.purpose,
    ffmpeg_hint: buildFfmpegMotionHint(profile, durationSeconds)
  };
}

function buildMotionPlanForVideo(video = {}) {
  const scenes = toArray(video.scenes);
  const plannedScenes = scenes.map((scene, index) =>
    buildSceneMotionPlan(scene, index, scenes.length)
  );

  return {
    script_id: video.script_id || video.scriptId,
    title: video.title || null,
    total_scenes: plannedScenes.length,
    total_duration_seconds: plannedScenes.reduce((sum, scene) => sum + scene.duration_seconds, 0),
    status: "motion_plan_ready",
    scenes: plannedScenes
  };
}

function buildMotionPlanBatch(manifest = [], manifestSource = "unknown") {
  const plans = toArray(manifest).map(buildMotionPlanForVideo);
  const totalScenes = plans.reduce((sum, plan) => sum + plan.total_scenes, 0);
  const totalDuration = plans.reduce((sum, plan) => sum + plan.total_duration_seconds, 0);

  return {
    generated_at: new Date().toISOString(),
    manifest_source: manifestSource,
    total_scripts: plans.length,
    summary: {
      total_scenes: totalScenes,
      total_duration_seconds: totalDuration,
      status: plans.length > 0 ? "motion_plan_batch_ready" : "motion_plan_batch_empty"
    },
    plans
  };
}

module.exports = {
  MOTION_PROFILES,
  buildMotionPlanBatch,
  buildMotionPlanForVideo,
  buildSceneMotionPlan,
  detectSegment
};
