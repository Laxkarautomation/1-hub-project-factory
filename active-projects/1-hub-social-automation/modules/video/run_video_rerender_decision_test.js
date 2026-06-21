const assert = require("assert");
const {
  buildVideoRerenderDecisionBatch,
  decideVideoRerender,
  detectDecisionReasons,
  selectDecision,
  selectRerenderPriority
} = require("./services/video_rerender_decision_engine");

const finalQualityReport = {
  audits: [
    {
      script_id: "approved_script",
      overall_render_quality_score: 92,
      quality_band: "excellent",
      hook_score: 91,
      retention_score: 84,
      detected_issues: [],
      status: "final_render_quality_ready"
    },
    {
      script_id: "minor_script",
      overall_render_quality_score: 82,
      quality_band: "good",
      hook_score: 58,
      retention_score: 76,
      detected_issues: [
        { issue_type: "subtitle_readability_issue", severity: "medium" }
      ],
      status: "final_render_quality_ready"
    },
    {
      script_id: "major_script",
      overall_render_quality_score: 64,
      quality_band: "needs_attention",
      hook_score: 84,
      retention_score: 52,
      detected_issues: [
        { issue_type: "retention_risk", severity: "high" }
      ],
      status: "final_render_quality_needs_attention"
    },
    {
      script_id: "regenerate_script",
      overall_render_quality_score: 38,
      quality_band: "poor",
      hook_score: 34,
      retention_score: 39,
      detected_issues: [
        { issue_type: "weak_hook", severity: "high" },
        { issue_type: "retention_risk", severity: "high" },
        { issue_type: "weak_motion_plan", severity: "high" },
        { issue_type: "subtitle_readability_issue", severity: "high" }
      ],
      status: "final_render_quality_needs_attention"
    }
  ]
};

const retentionReport = {
  reports: [
    { script_id: "approved_script", retention_score: 86, viewer_drop_risk: "low" },
    { script_id: "minor_script", retention_score: 76, viewer_drop_risk: "low" },
    { script_id: "major_script", retention_score: 52, viewer_drop_risk: "high" },
    { script_id: "regenerate_script", retention_score: 39, viewer_drop_risk: "high" }
  ]
};

const hookReport = {
  hooks: [
    { script_id: "approved_script", hook_strength_score: 91, status: "strong_hook" },
    { script_id: "minor_script", hook_strength_score: 58, status: "average_hook" },
    { script_id: "major_script", hook_strength_score: 84, status: "strong_hook" },
    { script_id: "regenerate_script", hook_strength_score: 34, status: "weak_hook" }
  ]
};

assert.strictEqual(selectRerenderPriority("approved", []), "none");
assert.strictEqual(selectDecision(92, []), "approved");
assert.strictEqual(selectDecision(76, ["weak_hook"]), "minor_rerender");
assert.strictEqual(selectDecision(61, ["retention_failure"]), "major_rerender");
assert.strictEqual(
  selectDecision(31, ["weak_hook", "retention_failure", "low_render_quality"]),
  "full_regeneration"
);

const regenerateReasons = detectDecisionReasons(
  finalQualityReport.audits[3],
  retentionReport.reports[3],
  hookReport.hooks[3]
);
assert.ok(regenerateReasons.includes("weak_hook"));
assert.ok(regenerateReasons.includes("retention_failure"));
assert.ok(regenerateReasons.includes("low_render_quality"));
assert.ok(regenerateReasons.includes("excessive_quality_issues"));

const approved = decideVideoRerender(
  finalQualityReport.audits[0],
  retentionReport,
  hookReport
);
assert.strictEqual(approved.decision, "approved");
assert.strictEqual(approved.rerender_required, false);
assert.strictEqual(approved.rerender_priority, "none");
assert.ok(Number.isInteger(approved.approval_score));
assert.deepStrictEqual(approved.decision_reasons, []);

const minor = decideVideoRerender(finalQualityReport.audits[1], retentionReport, hookReport);
assert.strictEqual(minor.decision, "minor_rerender");
assert.strictEqual(minor.rerender_required, true);
assert.strictEqual(minor.rerender_priority, "low");
assert.ok(minor.decision_reasons.includes("weak_hook"));

const major = decideVideoRerender(finalQualityReport.audits[2], retentionReport, hookReport);
assert.strictEqual(major.decision, "major_rerender");
assert.strictEqual(major.rerender_required, true);
assert.strictEqual(major.rerender_priority, "high");
assert.ok(major.decision_reasons.includes("retention_failure"));

const regenerate = decideVideoRerender(finalQualityReport.audits[3], retentionReport, hookReport);
assert.strictEqual(regenerate.decision, "full_regeneration");
assert.strictEqual(regenerate.rerender_required, true);
assert.strictEqual(regenerate.rerender_priority, "critical");

const batch = buildVideoRerenderDecisionBatch(finalQualityReport, retentionReport, hookReport);
assert.strictEqual(batch.total_scripts, 4);
assert.strictEqual(batch.summary.approved_videos, 1);
assert.strictEqual(batch.summary.rerender_videos, 3);
assert.strictEqual(batch.summary.full_regeneration_videos, 1);
assert.ok(Number.isInteger(batch.summary.average_approval_score));
assert.strictEqual(batch.summary.status, "video_rerender_decision_batch_ready");

console.log("Video rerender decision tests passed");
