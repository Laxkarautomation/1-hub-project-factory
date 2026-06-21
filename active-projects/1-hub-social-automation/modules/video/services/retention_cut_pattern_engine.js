function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function clampScore(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function roundOne(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function seconds(value = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function average(values = []) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length === 0) return 0;
  return nums.reduce((sum, item) => sum + item, 0) / nums.length;
}

function standardDeviation(values = []) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length <= 1) return 0;
  const mean = average(nums);
  const variance = average(nums.map(item => (item - mean) ** 2));
  return Math.sqrt(variance);
}

function uniqueRatio(values = []) {
  const filtered = values.filter(Boolean);
  if (filtered.length === 0) return 1;
  return new Set(filtered).size / filtered.length;
}

function findPlan(report = {}, scriptId) {
  return toArray(report.plans).find(plan => plan.script_id === scriptId) || {};
}

function findHook(report = {}, scriptId) {
  return toArray(report.hooks).find(hook => hook.script_id === scriptId) || {};
}

function findMotionScene(plan = {}, sceneNumber) {
  return toArray(plan.scenes).find(scene => Number(scene.scene) === Number(sceneNumber)) || {};
}

function buildTimeline(video = {}, motionPlan = {}, transitionPlan = {}) {
  return toArray(video.scenes).map((scene, index) => {
    const sceneNumber = scene.scene || index + 1;
    const motion = findMotionScene(motionPlan, sceneNumber);
    const transitionOut = toArray(transitionPlan.transitions)
      .find(item => Number(item.from_scene) === Number(sceneNumber)) || {};

    return {
      scene: sceneNumber,
      segment: motion.segment || scene.segment || scene.beat || scene.retention_role || "",
      duration_seconds: seconds(scene.duration_seconds || motion.duration_seconds),
      motion_type: motion.motion_type || "",
      camera_move: motion.camera_move || "",
      motion_intensity: motion.intensity || "",
      transition_type: transitionOut.transition_type || "",
      transition_intensity: transitionOut.intensity || "",
      transition_duration_ms: Number(transitionOut.duration_ms || 0)
    };
  });
}

function hasSoftTransition(transitionType = "", intensity = "") {
  const text = `${transitionType} ${intensity}`.toLowerCase();
  return ["soft", "smooth", "fade", "gentle", "calm"].some(term => text.includes(term));
}

function hasStrongTransition(transitionType = "", intensity = "") {
  const text = `${transitionType} ${intensity}`.toLowerCase();
  return ["hard", "impact", "flash", "sharp", "high"].some(term => text.includes(term));
}

function isSlowMotion(row = {}) {
  const text = `${row.motion_type} ${row.camera_move} ${row.motion_intensity}`.toLowerCase();
  return ["slow", "hold", "subtle"].some(term => text.includes(term));
}

function countRepeatedAdjacent(values = []) {
  return values.reduce((count, value, index) => {
    if (index === 0) return count;
    return value && value === values[index - 1] ? count + 1 : count;
  }, 0);
}

function issue(issueType, severity, scenes, reason, recommendationType) {
  return {
    issue_type: issueType,
    severity,
    scenes,
    reason,
    recommendation_type: recommendationType
  };
}

function detectPatternIssues(video = {}, motionPlan = {}, transitionPlan = {}, hook = {}) {
  const timeline = buildTimeline(video, motionPlan, transitionPlan);
  const durations = timeline.map(row => row.duration_seconds);
  const motionTypes = timeline.map(row => row.motion_type || row.camera_move);
  const transitionTypes = timeline.slice(0, -1).map(row => row.transition_type);
  const issues = [];

  const durationRepeats = countRepeatedAdjacent(durations);
  if (durationRepeats >= 1 || uniqueRatio(durations) < 0.7) {
    const repeatedScenes = timeline
      .filter((row, index) => index > 0 && row.duration_seconds === timeline[index - 1].duration_seconds)
      .map(row => row.scene);
    issues.push(issue(
      "repetitive_scene_durations",
      durationRepeats >= 2 ? "high" : "medium",
      repeatedScenes.length ? repeatedScenes : timeline.map(row => row.scene),
      "multiple scenes use the same or nearly identical duration, which can make the edit feel like a slideshow",
      "shorten_scene"
    ));
  }

  const motionRepeats = countRepeatedAdjacent(motionTypes);
  if (motionRepeats >= 1 || uniqueRatio(motionTypes) < 0.75) {
    const repeatedScenes = timeline
      .filter((row, index) => index > 0 && motionTypes[index] && motionTypes[index] === motionTypes[index - 1])
      .map(row => row.scene);
    issues.push(issue(
      "repetitive_motion_patterns",
      motionRepeats >= 2 ? "high" : "medium",
      repeatedScenes.length ? repeatedScenes : timeline.map(row => row.scene),
      "camera movement repeats too often across adjacent beats",
      "speed_up_motion"
    ));
  }

  const transitionRepeats = countRepeatedAdjacent(transitionTypes);
  if (transitionRepeats >= 1 || uniqueRatio(transitionTypes) < 0.75) {
    const repeatedScenes = timeline
      .slice(0, -1)
      .filter((row, index) => index > 0 && transitionTypes[index] && transitionTypes[index] === transitionTypes[index - 1])
      .map(row => row.scene);
    issues.push(issue(
      "repetitive_transitions",
      transitionRepeats >= 2 ? "high" : "medium",
      repeatedScenes.length ? repeatedScenes : timeline.slice(0, -1).map(row => row.scene),
      "transition language repeats before the viewer gets a pattern break",
      "stronger_transition"
    ));
  }

  const revealIndex = timeline.findIndex(row => String(row.segment).toLowerCase() === "reveal");
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  const revealStart = revealIndex > -1
    ? durations.slice(0, revealIndex).reduce((sum, value) => sum + value, 0)
    : totalDuration;
  const revealStartRatio = totalDuration > 0 ? revealStart / totalDuration : 1;
  const revealTransitionIn = revealIndex > 0 ? timeline[revealIndex - 1] : {};
  const weakRevealTransition = !hasStrongTransition(
    revealTransitionIn.transition_type,
    revealTransitionIn.transition_intensity
  );
  const weakRevealTease = Number(hook.reveal_tease_score || 0) > 0 && Number(hook.reveal_tease_score || 0) < 55;

  if (revealIndex === -1 || revealStartRatio > 0.68 || weakRevealTransition || weakRevealTease) {
    issues.push(issue(
      "weak_reveal_timing",
      revealStartRatio > 0.75 || weakRevealTransition ? "high" : "medium",
      revealIndex > -1 ? [timeline[revealIndex].scene] : [],
      "the reveal is not punctuated strongly enough for the current pacing curve",
      "insert_pattern_break"
    ));
  }

  const deadZoneScenes = timeline
    .filter(row =>
      row.duration_seconds >= 11 &&
      isSlowMotion(row) &&
      hasSoftTransition(row.transition_type, row.transition_intensity)
    )
    .map(row => row.scene);

  if (deadZoneScenes.length > 0) {
    issues.push(issue(
      "dead_zone",
      deadZoneScenes.length >= 2 ? "high" : "medium",
      deadZoneScenes,
      "long slow-moving sections risk losing attention before the next meaningful pattern change",
      "add_cut"
    ));
  }

  return issues;
}

function scorePatternVariation(timeline = []) {
  const durations = timeline.map(row => row.duration_seconds);
  const durationSpread = standardDeviation(durations);
  const durationScore = clampScore(Math.min(100, durationSpread * 22));
  const motionScore = clampScore(uniqueRatio(timeline.map(row => row.motion_type || row.camera_move)) * 100);
  const transitionScore = clampScore(uniqueRatio(timeline.slice(0, -1).map(row => row.transition_type)) * 100);
  const adjacentPenalty =
    countRepeatedAdjacent(timeline.map(row => row.motion_type || row.camera_move)) * 8 +
    countRepeatedAdjacent(timeline.slice(0, -1).map(row => row.transition_type)) * 8;

  return clampScore(durationScore * 0.25 + motionScore * 0.40 + transitionScore * 0.35 - adjacentPenalty);
}

function scoreSuspenseCurve(timeline = [], hook = {}) {
  const totalDuration = timeline.reduce((sum, row) => sum + row.duration_seconds, 0);
  const revealIndex = timeline.findIndex(row => String(row.segment).toLowerCase() === "reveal");
  const revealStart = revealIndex > -1
    ? timeline.slice(0, revealIndex).reduce((sum, row) => sum + row.duration_seconds, 0)
    : totalDuration;
  const revealRatio = totalDuration > 0 ? revealStart / totalDuration : 1;
  const timingScore = clampScore(100 - Math.abs(revealRatio - 0.62) * 220);
  const hookScore = clampScore(hook.hook_strength_score || 65);
  const teaseScore = clampScore(hook.reveal_tease_score || 60);
  const revealTransitionIn = revealIndex > 0 ? timeline[revealIndex - 1] : {};
  const transitionScore = hasStrongTransition(
    revealTransitionIn.transition_type,
    revealTransitionIn.transition_intensity
  ) ? 90 : 45;

  return clampScore(timingScore * 0.35 + hookScore * 0.25 + teaseScore * 0.20 + transitionScore * 0.20);
}

function scorePacingConsistency(timeline = []) {
  const durations = timeline.map(row => row.duration_seconds);
  const avgDuration = average(durations);
  const stddev = standardDeviation(durations);
  const longScenePenalty = timeline.filter(row => row.duration_seconds >= 12).length * 9;
  const slowScenePenalty = timeline.filter(row => row.duration_seconds >= 10 && isSlowMotion(row)).length * 5;
  const variancePenalty = avgDuration > 0 ? (stddev / avgDuration) * 70 : 0;

  return clampScore(100 - variancePenalty - longScenePenalty - slowScenePenalty);
}

function classifyDropRisk(retentionScore = 0) {
  if (retentionScore >= 75) return "low";
  if (retentionScore >= 55) return "medium";
  return "high";
}

function buildRecommendations(issues = []) {
  const priorityBySeverity = { high: "high", medium: "medium", low: "low" };
  const seen = new Set();

  return issues.map(item => {
    const key = `${item.recommendation_type}:${toArray(item.scenes).join(",")}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      recommendation_type: item.recommendation_type,
      priority: priorityBySeverity[item.severity] || "medium",
      scenes: toArray(item.scenes),
      reason: item.reason
    };
  }).filter(Boolean);
}

function buildRetentionCutPatternForVideo(
  video = {},
  motionReport = {},
  transitionReport = {},
  hookReport = {}
) {
  const scriptId = video.script_id || video.scriptId;
  const motionPlan = findPlan(motionReport, scriptId);
  const transitionPlan = findPlan(transitionReport, scriptId);
  const hook = findHook(hookReport, scriptId);
  const timeline = buildTimeline(video, motionPlan, transitionPlan);
  const totalDuration = timeline.reduce((sum, row) => sum + row.duration_seconds, 0);
  const totalTransitions = toArray(transitionPlan.transitions).length;
  const cutDensity = totalDuration > 0 ? (totalTransitions / totalDuration) * 30 : 0;
  const patternVariationScore = scorePatternVariation(timeline);
  const suspenseCurveScore = scoreSuspenseCurve(timeline, hook);
  const pacingConsistencyScore = scorePacingConsistency(timeline);
  const detectedIssues = detectPatternIssues(video, motionPlan, transitionPlan, hook);
  const issuePenalty = detectedIssues.reduce((sum, item) => {
    if (item.severity === "high") return sum + 6;
    if (item.severity === "medium") return sum + 3;
    return sum + 1;
  }, 0);
  const densityScore = clampScore(100 - Math.abs(cutDensity - 3.2) * 18);
  const retentionScore = clampScore(
    patternVariationScore * 0.30 +
    suspenseCurveScore * 0.30 +
    pacingConsistencyScore * 0.25 +
    densityScore * 0.15 -
    issuePenalty
  );

  return {
    script_id: scriptId,
    title: video.title || null,
    total_scenes: timeline.length,
    total_duration_seconds: totalDuration,
    retention_score: retentionScore,
    viewer_drop_risk: classifyDropRisk(retentionScore),
    cut_density: roundOne(cutDensity),
    pattern_variation_score: patternVariationScore,
    suspense_curve_score: suspenseCurveScore,
    pacing_consistency_score: pacingConsistencyScore,
    detected_issues: detectedIssues,
    recommendations: buildRecommendations(detectedIssues),
    status: "retention_cut_pattern_ready"
  };
}

function buildRetentionCutPatternBatch(
  manifest = [],
  motionReport = {},
  transitionReport = {},
  hookReport = {},
  manifestSource = "modules/video/output/optimized_video_manifest.json"
) {
  const reports = toArray(manifest).map(video =>
    buildRetentionCutPatternForVideo(video, motionReport, transitionReport, hookReport)
  );

  return {
    generated_at: new Date().toISOString(),
    manifest_source: manifestSource,
    total_scripts: reports.length,
    summary: {
      total_scenes: reports.reduce((sum, report) => sum + report.total_scenes, 0),
      average_retention_score: clampScore(average(reports.map(report => report.retention_score))),
      high_drop_risk_scripts: reports.filter(report => report.viewer_drop_risk === "high").length,
      medium_drop_risk_scripts: reports.filter(report => report.viewer_drop_risk === "medium").length,
      low_drop_risk_scripts: reports.filter(report => report.viewer_drop_risk === "low").length,
      total_recommendations: reports.reduce((sum, report) => sum + report.recommendations.length, 0),
      status: reports.length > 0
        ? "retention_cut_pattern_batch_ready"
        : "retention_cut_pattern_batch_empty"
    },
    reports
  };
}

module.exports = {
  buildRetentionCutPatternBatch,
  buildRetentionCutPatternForVideo,
  buildTimeline,
  classifyDropRisk,
  detectPatternIssues,
  scorePacingConsistency,
  scorePatternVariation,
  scoreSuspenseCurve
};
