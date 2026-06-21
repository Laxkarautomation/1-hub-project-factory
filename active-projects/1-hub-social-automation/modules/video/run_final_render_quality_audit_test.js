const assert = require("assert");
const {
  buildFinalRenderQualityAuditBatch,
  buildFinalRenderQualityAuditForVideo,
  classifyQualityBand,
  detectQualityIssues,
  scoreTiming
} = require("./services/final_render_quality_audit");

const completeVideo = {
  script_id: "generic_script_001",
  title: "Complete story",
  scenes: [
    { scene: 1, duration_seconds: 8 },
    { scene: 2, duration_seconds: 10 },
    { scene: 3, duration_seconds: 8 }
  ]
};

const weakVideo = {
  script_id: "generic_script_002",
  title: "Weak story",
  scenes: [
    { scene: 1, duration_seconds: 0 },
    { scene: 2 }
  ]
};

const motionReport = {
  plans: [
    {
      script_id: "generic_script_001",
      status: "motion_plan_ready",
      total_scenes: 3,
      scenes: [
        { scene: 1, motion_type: "slow_zoom_in_push_in", ffmpeg_hint: { frames: 240 } },
        { scene: 2, motion_type: "slow_pan", ffmpeg_hint: { frames: 300 } },
        { scene: 3, motion_type: "dramatic_push_in", ffmpeg_hint: { frames: 240 } }
      ]
    },
    {
      script_id: "generic_script_002",
      status: "motion_plan_ready",
      total_scenes: 1,
      scenes: [
        { scene: 1, motion_type: "slow_pan" }
      ]
    }
  ]
};

const transitionReport = {
  plans: [
    {
      script_id: "generic_script_001",
      status: "transition_intelligence_ready",
      total_transitions: 2,
      transitions: [
        { from_scene: 1, to_scene: 2, transition_type: "hard_cut", duration_ms: 120, reason: "fast hook handoff" },
        { from_scene: 2, to_scene: 3, transition_type: "impact_flash", duration_ms: 180, reason: "reveal punctuation" }
      ]
    },
    {
      script_id: "generic_script_002",
      status: "transition_intelligence_ready",
      total_transitions: 0,
      transitions: []
    }
  ]
};

const hookReport = {
  hooks: [
    { script_id: "generic_script_001", hook_strength_score: 88, status: "strong_hook" },
    { script_id: "generic_script_002", hook_strength_score: 41, status: "weak_hook" }
  ]
};

const retentionReport = {
  reports: [
    { script_id: "generic_script_001", retention_score: 82, viewer_drop_risk: "low", status: "retention_cut_pattern_ready" },
    { script_id: "generic_script_002", retention_score: 48, viewer_drop_risk: "high", status: "retention_cut_pattern_ready" }
  ]
};

const subtitleReport = {
  plans: [
    {
      script_id: "generic_script_001",
      average_readability_score: 84,
      detected_issues: [],
      status: "subtitle_overlay_plan_ready"
    },
    {
      script_id: "generic_script_002",
      average_readability_score: 58,
      detected_issues: [
        { issue_type: "low_readability", severity: "high", scenes: [1] }
      ],
      status: "subtitle_overlay_plan_ready"
    }
  ]
};

assert.strictEqual(classifyQualityBand(91), "excellent");
assert.strictEqual(classifyQualityBand(80), "good");
assert.strictEqual(classifyQualityBand(66), "needs_attention");
assert.strictEqual(classifyQualityBand(40), "poor");
assert.strictEqual(scoreTiming(completeVideo), 100);
assert.ok(scoreTiming(weakVideo) < 70);

const strongAudit = buildFinalRenderQualityAuditForVideo(
  completeVideo,
  motionReport,
  transitionReport,
  hookReport,
  retentionReport,
  subtitleReport
);

assert.strictEqual(strongAudit.script_id, "generic_script_001");
assert.ok(Number.isInteger(strongAudit.timing_score));
assert.ok(Number.isInteger(strongAudit.motion_score));
assert.ok(Number.isInteger(strongAudit.transition_score));
assert.ok(Number.isInteger(strongAudit.hook_score));
assert.ok(Number.isInteger(strongAudit.retention_score));
assert.ok(Number.isInteger(strongAudit.subtitle_score));
assert.ok(Number.isInteger(strongAudit.overall_render_quality_score));
assert.ok(["excellent", "good", "needs_attention", "poor"].includes(strongAudit.quality_band));
assert.strictEqual(strongAudit.status, "final_render_quality_ready");
assert.deepStrictEqual(strongAudit.detected_issues, []);

const weakAudit = buildFinalRenderQualityAuditForVideo(
  weakVideo,
  motionReport,
  transitionReport,
  hookReport,
  retentionReport,
  subtitleReport
);
const weakIssues = detectQualityIssues(weakAudit);

assert.ok(weakIssues.some(issue => issue.issue_type === "timing_missing"));
assert.ok(weakIssues.some(issue => issue.issue_type === "weak_motion_plan"));
assert.ok(weakIssues.some(issue => issue.issue_type === "weak_transitions"));
assert.ok(weakIssues.some(issue => issue.issue_type === "weak_hook"));
assert.ok(weakIssues.some(issue => issue.issue_type === "retention_risk"));
assert.ok(weakIssues.some(issue => issue.issue_type === "subtitle_readability_issue"));
assert.strictEqual(weakAudit.status, "final_render_quality_needs_attention");

const batch = buildFinalRenderQualityAuditBatch(
  [completeVideo, weakVideo],
  motionReport,
  transitionReport,
  hookReport,
  retentionReport,
  subtitleReport
);

assert.strictEqual(batch.total_scripts, 2);
assert.strictEqual(batch.summary.status, "final_render_quality_audit_batch_ready");
assert.ok(Number.isInteger(batch.summary.average_overall_render_quality_score));
assert.strictEqual(batch.audits.length, 2);

console.log("Final render quality audit tests passed");
