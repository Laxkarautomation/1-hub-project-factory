function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function clampScore(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function average(values = []) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length === 0) return 0;
  return nums.reduce((sum, item) => sum + item, 0) / nums.length;
}

function findPlan(report = {}, scriptId) {
  return toArray(report.plans).find(item => item.script_id === scriptId) || {};
}

function findReport(report = {}, scriptId) {
  return toArray(report.reports).find(item => item.script_id === scriptId) || {};
}

function findHook(report = {}, scriptId) {
  return toArray(report.hooks).find(item => item.script_id === scriptId) || {};
}

function scoreTiming(video = {}) {
  const scenes = toArray(video.scenes);
  if (scenes.length === 0) return 0;

  const validDurations = scenes.filter(scene => Number(scene.duration_seconds || 0) > 0).length;
  const totalDuration = scenes.reduce((sum, scene) => sum + Number(scene.duration_seconds || 0), 0);
  const completenessScore = (validDurations / scenes.length) * 100;
  const durationScore = totalDuration > 0 ? 100 : 0;

  return clampScore(completenessScore * 0.85 + durationScore * 0.15);
}

function scoreMotion(video = {}, motionPlan = {}) {
  const scenes = toArray(video.scenes);
  const motionScenes = toArray(motionPlan.scenes);
  if (scenes.length === 0 || motionScenes.length === 0) return 0;

  const coverageScore = Math.min(100, (motionScenes.length / scenes.length) * 100);
  const hintedScenes = motionScenes.filter(scene => scene.ffmpeg_hint && Number(scene.ffmpeg_hint.frames || 0) > 0).length;
  const hintScore = Math.min(100, (hintedScenes / scenes.length) * 100);
  const motionTypes = motionScenes.map(scene => scene.motion_type || scene.camera_move).filter(Boolean);
  const variationScore = motionTypes.length
    ? Math.min(100, (new Set(motionTypes).size / motionTypes.length) * 100 + 20)
    : 0;
  const statusScore = motionPlan.status === "motion_plan_ready" ? 100 : 55;

  return clampScore(coverageScore * 0.35 + hintScore * 0.30 + variationScore * 0.20 + statusScore * 0.15);
}

function scoreTransitions(video = {}, transitionPlan = {}) {
  const scenes = toArray(video.scenes);
  const transitions = toArray(transitionPlan.transitions);
  const expectedTransitions = Math.max(0, scenes.length - 1);
  if (expectedTransitions === 0) return scenes.length > 0 ? 100 : 0;

  const coverageScore = Math.min(100, (transitions.length / expectedTransitions) * 100);
  const typedScore = Math.min(
    100,
    (transitions.filter(item => item.transition_type).length / expectedTransitions) * 100
  );
  const reasonScore = Math.min(
    100,
    (transitions.filter(item => item.reason).length / expectedTransitions) * 100
  );
  const durationScore = Math.min(
    100,
    (transitions.filter(item => Number(item.duration_ms || 0) > 0).length / expectedTransitions) * 100
  );
  const statusScore = transitionPlan.status === "transition_intelligence_ready" ? 100 : 55;

  return clampScore(
    coverageScore * 0.35 +
    typedScore * 0.20 +
    reasonScore * 0.20 +
    durationScore * 0.15 +
    statusScore * 0.10
  );
}

function scoreHook(hook = {}) {
  if (!hook || Object.keys(hook).length === 0) return 0;
  const strength = Number(hook.hook_strength_score || 0);
  const statusBonus = hook.status === "strong_hook" ? 5 : hook.status === "average_hook" ? 0 : -10;
  return clampScore(strength + statusBonus);
}

function scoreRetention(retention = {}) {
  if (!retention || Object.keys(retention).length === 0) return 0;
  const base = Number(retention.retention_score || 0);
  const riskPenalty = retention.viewer_drop_risk === "high"
    ? 12
    : retention.viewer_drop_risk === "medium"
      ? 5
      : 0;
  return clampScore(base - riskPenalty);
}

function scoreSubtitle(subtitle = {}) {
  if (!subtitle || Object.keys(subtitle).length === 0) return 0;
  const base = Number(subtitle.average_readability_score || 0);
  const issuePenalty = toArray(subtitle.detected_issues).reduce((sum, issue) => {
    if (issue.severity === "high") return sum + 8;
    if (issue.severity === "medium") return sum + 4;
    return sum + 2;
  }, 0);
  return clampScore(base - issuePenalty);
}

function classifyQualityBand(score = 0) {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "needs_attention";
  return "poor";
}

function issue(issueType, severity, reason) {
  return { issue_type: issueType, severity, reason };
}

function detectQualityIssues(audit = {}) {
  const issues = [];

  if (audit.timing_score < 80) {
    issues.push(issue(
      "timing_missing",
      audit.timing_score < 60 ? "high" : "medium",
      "one or more scenes are missing usable duration timing"
    ));
  }

  if (audit.motion_score < 70) {
    issues.push(issue(
      "weak_motion_plan",
      audit.motion_score < 50 ? "high" : "medium",
      "motion planning coverage or render hints are incomplete"
    ));
  }

  if (audit.transition_score < 70) {
    issues.push(issue(
      "weak_transitions",
      audit.transition_score < 50 ? "high" : "medium",
      "transition plan coverage or transition details are incomplete"
    ));
  }

  if (audit.hook_score < 60) {
    issues.push(issue(
      "weak_hook",
      audit.hook_score < 45 ? "high" : "medium",
      "hook strength is below the threshold for final render readiness"
    ));
  }

  if (audit.retention_score < 65 || audit.viewer_drop_risk === "high") {
    issues.push(issue(
      "retention_risk",
      audit.viewer_drop_risk === "high" ? "high" : "medium",
      "retention planning indicates viewer drop risk"
    ));
  }

  if (audit.subtitle_score < 70) {
    issues.push(issue(
      "subtitle_readability_issue",
      audit.subtitle_score < 55 ? "high" : "medium",
      "subtitle readability or overlay density needs attention"
    ));
  }

  return issues;
}

function buildFinalRenderQualityAuditForVideo(
  video = {},
  motionReport = {},
  transitionReport = {},
  hookReport = {},
  retentionReport = {},
  subtitleReport = {}
) {
  const scriptId = video.script_id || video.scriptId;
  const motionPlan = findPlan(motionReport, scriptId);
  const transitionPlan = findPlan(transitionReport, scriptId);
  const hook = findHook(hookReport, scriptId);
  const retention = findReport(retentionReport, scriptId);
  const subtitle = findPlan(subtitleReport, scriptId);

  const timingScore = scoreTiming(video);
  const motionScore = scoreMotion(video, motionPlan);
  const transitionScore = scoreTransitions(video, transitionPlan);
  const hookScore = scoreHook(hook);
  const retentionScore = scoreRetention(retention);
  const subtitleScore = scoreSubtitle(subtitle);
  const overallRenderQualityScore = clampScore(
    timingScore * 0.15 +
    motionScore * 0.16 +
    transitionScore * 0.16 +
    hookScore * 0.17 +
    retentionScore * 0.20 +
    subtitleScore * 0.16
  );
  const audit = {
    script_id: scriptId,
    title: video.title || null,
    timing_score: timingScore,
    motion_score: motionScore,
    transition_score: transitionScore,
    hook_score: hookScore,
    retention_score: retentionScore,
    subtitle_score: subtitleScore,
    viewer_drop_risk: retention.viewer_drop_risk || "unknown",
    overall_render_quality_score: overallRenderQualityScore,
    quality_band: classifyQualityBand(overallRenderQualityScore)
  };
  const detectedIssues = detectQualityIssues(audit);

  return {
    ...audit,
    detected_issues: detectedIssues,
    status: detectedIssues.some(item => item.severity === "high") || overallRenderQualityScore < 75
      ? "final_render_quality_needs_attention"
      : "final_render_quality_ready"
  };
}

function buildFinalRenderQualityAuditBatch(
  manifest = [],
  motionReport = {},
  transitionReport = {},
  hookReport = {},
  retentionReport = {},
  subtitleReport = {},
  manifestSource = "modules/video/output/optimized_video_manifest.json"
) {
  const audits = toArray(manifest).map(video =>
    buildFinalRenderQualityAuditForVideo(
      video,
      motionReport,
      transitionReport,
      hookReport,
      retentionReport,
      subtitleReport
    )
  );

  return {
    generated_at: new Date().toISOString(),
    manifest_source: manifestSource,
    total_scripts: audits.length,
    summary: {
      average_overall_render_quality_score: clampScore(
        average(audits.map(audit => audit.overall_render_quality_score))
      ),
      excellent_scripts: audits.filter(audit => audit.quality_band === "excellent").length,
      good_scripts: audits.filter(audit => audit.quality_band === "good").length,
      needs_attention_scripts: audits.filter(audit => audit.quality_band === "needs_attention").length,
      poor_scripts: audits.filter(audit => audit.quality_band === "poor").length,
      total_issues: audits.reduce((sum, audit) => sum + audit.detected_issues.length, 0),
      status: audits.length > 0
        ? "final_render_quality_audit_batch_ready"
        : "final_render_quality_audit_batch_empty"
    },
    audits
  };
}

module.exports = {
  buildFinalRenderQualityAuditBatch,
  buildFinalRenderQualityAuditForVideo,
  classifyQualityBand,
  detectQualityIssues,
  scoreHook,
  scoreMotion,
  scoreRetention,
  scoreSubtitle,
  scoreTiming,
  scoreTransitions
};
