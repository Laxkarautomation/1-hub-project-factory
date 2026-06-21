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

function findReport(report = {}, scriptId) {
  return toArray(report.reports).find(item => item.script_id === scriptId) || {};
}

function findHook(report = {}, scriptId) {
  return toArray(report.hooks).find(item => item.script_id === scriptId) || {};
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function hasHighIssue(audit = {}) {
  return toArray(audit.detected_issues).some(issue => issue.severity === "high");
}

function detectDecisionReasons(audit = {}, retention = {}, hook = {}) {
  const reasons = [];
  const hookStrength = Number(hook.hook_strength_score || audit.hook_score || 0);
  const retentionScore = Number(retention.retention_score || audit.retention_score || 0);
  const renderQualityScore = Number(audit.overall_render_quality_score || 0);
  const issueCount = toArray(audit.detected_issues).length;

  if (hook.status === "weak_hook" || hookStrength < 60 || Number(audit.hook_score || 0) < 60) {
    reasons.push("weak_hook");
  }

  if (
    retention.viewer_drop_risk === "high" ||
    audit.viewer_drop_risk === "high" ||
    retentionScore < 60
  ) {
    reasons.push("retention_failure");
  }

  if (
    renderQualityScore < 70 ||
    ["poor", "needs_attention"].includes(audit.quality_band) ||
    audit.status === "final_render_quality_needs_attention"
  ) {
    reasons.push("low_render_quality");
  }

  if (issueCount >= 3 || (issueCount >= 2 && hasHighIssue(audit))) {
    reasons.push("excessive_quality_issues");
  }

  return unique(reasons);
}

function calculateApprovalScore(audit = {}, retention = {}, hook = {}, reasons = []) {
  const renderQualityScore = Number(audit.overall_render_quality_score || 0);
  const retentionScore = Number(retention.retention_score || audit.retention_score || 0);
  const hookScore = Number(hook.hook_strength_score || audit.hook_score || 0);
  const issuePenalty = toArray(audit.detected_issues).reduce((sum, issue) => {
    if (issue.severity === "high") return sum + 6;
    if (issue.severity === "medium") return sum + 3;
    return sum + 1;
  }, 0);
  const reasonPenalty = reasons.reduce((sum, reason) => {
    if (reason === "weak_hook") return sum + 6;
    if (reason === "retention_failure") return sum + 10;
    if (reason === "low_render_quality") return sum + 8;
    if (reason === "excessive_quality_issues") return sum + 6;
    return sum;
  }, 0);

  return clampScore(
    renderQualityScore * 0.45 +
    retentionScore * 0.30 +
    hookScore * 0.25 -
    issuePenalty -
    reasonPenalty
  );
}

function selectDecision(approvalScore = 0, reasons = []) {
  const reasonSet = new Set(reasons);
  const majorFailureCount = [
    "weak_hook",
    "retention_failure",
    "low_render_quality"
  ].filter(reason => reasonSet.has(reason)).length;

  if (
    approvalScore < 35 ||
    majorFailureCount >= 3 ||
    (reasonSet.has("excessive_quality_issues") && approvalScore < 55)
  ) {
    return "full_regeneration";
  }

  if (reasons.length === 1 && reasonSet.has("weak_hook") && approvalScore >= 55) {
    return "minor_rerender";
  }

  if (
    approvalScore < 70 ||
    reasonSet.has("retention_failure") ||
    reasonSet.has("low_render_quality") ||
    reasonSet.has("excessive_quality_issues")
  ) {
    return "major_rerender";
  }

  if (approvalScore < 82 || reasonSet.has("weak_hook")) {
    return "minor_rerender";
  }

  return "approved";
}

function selectRerenderPriority(decision, reasons = []) {
  if (decision === "approved") return "none";
  if (decision === "full_regeneration") return "critical";
  if (decision === "major_rerender") return "high";
  if (reasons.includes("weak_hook")) return "low";
  return "low";
}

function decideVideoRerender(audit = {}, retentionReport = {}, hookReport = {}) {
  const scriptId = audit.script_id;
  const retention = findReport(retentionReport, scriptId);
  const hook = findHook(hookReport, scriptId);
  const decisionReasons = detectDecisionReasons(audit, retention, hook);
  const approvalScore = calculateApprovalScore(audit, retention, hook, decisionReasons);
  const decision = selectDecision(approvalScore, decisionReasons);
  const finalDecisionReasons = decision !== "approved" && decisionReasons.length === 0
    ? ["borderline_approval_score"]
    : decisionReasons;
  const rerenderRequired = decision !== "approved";

  return {
    script_id: scriptId,
    title: audit.title || null,
    approval_score: approvalScore,
    rerender_required: rerenderRequired,
    rerender_priority: selectRerenderPriority(decision, finalDecisionReasons),
    decision,
    decision_reasons: finalDecisionReasons,
    source_scores: {
      render_quality_score: Number(audit.overall_render_quality_score || 0),
      retention_score: Number(retention.retention_score || audit.retention_score || 0),
      hook_strength_score: Number(hook.hook_strength_score || audit.hook_score || 0)
    },
    status: decision
  };
}

function buildVideoRerenderDecisionBatch(
  finalQualityReport = {},
  retentionReport = {},
  hookReport = {}
) {
  const decisions = toArray(finalQualityReport.audits).map(audit =>
    decideVideoRerender(audit, retentionReport, hookReport)
  );
  const rerenderVideos = decisions.filter(item => item.rerender_required).length;
  const fullRegenerationVideos = decisions.filter(item => item.decision === "full_regeneration").length;

  return {
    generated_at: new Date().toISOString(),
    total_scripts: decisions.length,
    summary: {
      approved_videos: decisions.filter(item => item.decision === "approved").length,
      rerender_videos: rerenderVideos,
      full_regeneration_videos: fullRegenerationVideos,
      average_approval_score: clampScore(average(decisions.map(item => item.approval_score))),
      status: decisions.length > 0
        ? "video_rerender_decision_batch_ready"
        : "video_rerender_decision_batch_empty"
    },
    decisions
  };
}

module.exports = {
  buildVideoRerenderDecisionBatch,
  calculateApprovalScore,
  decideVideoRerender,
  detectDecisionReasons,
  selectDecision,
  selectRerenderPriority
};
