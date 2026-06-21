const assert = require("assert");
const {
  buildTransitionIntelligenceBatch,
  buildTransitionsForVideo,
  detectSegment,
  selectTransition
} = require("./services/transition_intelligence_engine");

const video = {
  script_id: "generic_script_001",
  scenes: [
    { scene: 1, duration_seconds: 8 },
    { scene: 2, duration_seconds: 11 },
    { scene: 3, duration_seconds: 8 },
    { scene: 4, duration_seconds: 12 },
    { scene: 5, duration_seconds: 7 }
  ]
};

assert.strictEqual(detectSegment(video.scenes[0], 0, 5), "hook");
assert.strictEqual(selectTransition("hook", "context").transition_type, "hard_cut");
assert.strictEqual(selectTransition("context", "evidence").transition_type, "soft_dissolve");
assert.strictEqual(selectTransition("evidence", "evidence").transition_type, "zoom_blend");
assert.strictEqual(selectTransition("evidence", "reveal").transition_type, "impact_flash");
assert.strictEqual(selectTransition("reveal", "cta").transition_type, "smooth_fade");

const plan = buildTransitionsForVideo(video);
assert.strictEqual(plan.script_id, "generic_script_001");
assert.strictEqual(plan.total_transitions, 4);
assert.deepStrictEqual(
  plan.transitions.map(item => item.transition_type),
  ["hard_cut", "soft_dissolve", "impact_flash", "smooth_fade"]
);
assert.ok(plan.transitions.every(item => Number.isInteger(item.duration_ms)));
assert.ok(plan.transitions.every(item => item.reason));

const evidenceVideo = {
  script_id: "generic_script_002",
  scenes: [
    { scene: 1, segment: "evidence" },
    { scene: 2, segment: "evidence" }
  ]
};
assert.strictEqual(
  buildTransitionsForVideo(evidenceVideo).transitions[0].transition_type,
  "zoom_blend"
);

const batch = buildTransitionIntelligenceBatch([video], "modules/video/output/optimized_video_manifest.json");
assert.strictEqual(batch.total_scripts, 1);
assert.strictEqual(batch.summary.total_transitions, 4);
assert.strictEqual(batch.summary.status, "transition_intelligence_batch_ready");
assert.strictEqual(batch.manifest_source, "modules/video/output/optimized_video_manifest.json");

console.log("Transition intelligence tests passed");
