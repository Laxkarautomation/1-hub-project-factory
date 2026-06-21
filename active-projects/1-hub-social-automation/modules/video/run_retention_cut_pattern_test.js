const assert = require("assert");
const {
  buildRetentionCutPatternBatch,
  buildRetentionCutPatternForVideo,
  classifyDropRisk,
  detectPatternIssues
} = require("./services/retention_cut_pattern_engine");

const video = {
  script_id: "generic_script_001",
  title: "Test story",
  scenes: [
    { scene: 1, duration_seconds: 8, narration: "A strange opening." },
    { scene: 2, duration_seconds: 12, narration: "The setup slows down." },
    { scene: 3, duration_seconds: 12, narration: "The same rhythm continues." },
    { scene: 4, duration_seconds: 12, narration: "The reveal finally arrives." },
    { scene: 5, duration_seconds: 7, narration: "Comment with your theory." }
  ]
};

const motionReport = {
  plans: [
    {
      script_id: "generic_script_001",
      scenes: [
        { scene: 1, segment: "hook", duration_seconds: 8, motion_type: "slow_zoom_in_push_in", camera_move: "push_in", intensity: "slow" },
        { scene: 2, segment: "context", duration_seconds: 12, motion_type: "slow_pan", camera_move: "pan", intensity: "slow" },
        { scene: 3, segment: "evidence", duration_seconds: 12, motion_type: "slow_pan", camera_move: "pan", intensity: "slow" },
        { scene: 4, segment: "reveal", duration_seconds: 12, motion_type: "slow_pan", camera_move: "pan", intensity: "slow" },
        { scene: 5, segment: "cta", duration_seconds: 7, motion_type: "slow_zoom_out_or_hold", camera_move: "hold", intensity: "slow" }
      ]
    }
  ]
};

const transitionReport = {
  plans: [
    {
      script_id: "generic_script_001",
      transitions: [
        { from_scene: 1, to_scene: 2, transition_type: "soft_dissolve", duration_ms: 450, intensity: "gentle" },
        { from_scene: 2, to_scene: 3, transition_type: "soft_dissolve", duration_ms: 450, intensity: "gentle" },
        { from_scene: 3, to_scene: 4, transition_type: "soft_dissolve", duration_ms: 450, intensity: "gentle" },
        { from_scene: 4, to_scene: 5, transition_type: "smooth_fade", duration_ms: 650, intensity: "calm" }
      ]
    }
  ]
};

const hookReport = {
  hooks: [
    {
      script_id: "generic_script_001",
      hook_strength_score: 58,
      reveal_tease_score: 42
    }
  ]
};

assert.strictEqual(classifyDropRisk(82), "low");
assert.strictEqual(classifyDropRisk(64), "medium");
assert.strictEqual(classifyDropRisk(41), "high");

const issues = detectPatternIssues(video, motionReport.plans[0], transitionReport.plans[0], hookReport.hooks[0]);
assert.ok(issues.some(issue => issue.issue_type === "repetitive_scene_durations"));
assert.ok(issues.some(issue => issue.issue_type === "repetitive_motion_patterns"));
assert.ok(issues.some(issue => issue.issue_type === "repetitive_transitions"));
assert.ok(issues.some(issue => issue.issue_type === "weak_reveal_timing"));
assert.ok(issues.some(issue => issue.issue_type === "dead_zone"));

const report = buildRetentionCutPatternForVideo(video, motionReport, transitionReport, hookReport);
assert.strictEqual(report.script_id, "generic_script_001");
assert.strictEqual(report.total_scenes, 5);
assert.strictEqual(report.total_duration_seconds, 51);
assert.ok(Number.isInteger(report.retention_score));
assert.ok(["low", "medium", "high"].includes(report.viewer_drop_risk));
assert.strictEqual(typeof report.cut_density, "number");
assert.ok(Number.isInteger(report.pattern_variation_score));
assert.ok(Number.isInteger(report.suspense_curve_score));
assert.ok(Number.isInteger(report.pacing_consistency_score));
assert.ok(report.detected_issues.length >= 5);
assert.ok(report.recommendations.some(item => item.recommendation_type === "add_cut"));
assert.ok(report.recommendations.some(item => item.recommendation_type === "shorten_scene"));
assert.ok(report.recommendations.some(item => item.recommendation_type === "speed_up_motion"));
assert.ok(report.recommendations.some(item => item.recommendation_type === "stronger_transition"));
assert.ok(report.recommendations.some(item => item.recommendation_type === "insert_pattern_break"));

const batch = buildRetentionCutPatternBatch([video], motionReport, transitionReport, hookReport);
assert.strictEqual(batch.total_scripts, 1);
assert.strictEqual(batch.summary.total_scenes, 5);
assert.strictEqual(batch.summary.status, "retention_cut_pattern_batch_ready");
assert.ok(Number.isInteger(batch.summary.average_retention_score));

console.log("Retention cut pattern tests passed");
