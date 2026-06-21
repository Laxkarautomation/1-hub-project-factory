const assert = require("assert");
const {
  buildMotionPlanBatch,
  buildMotionPlanForVideo,
  detectSegment
} = require("./services/motion_planning_engine");

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
assert.strictEqual(detectSegment(video.scenes[1], 1, 5), "context");
assert.strictEqual(detectSegment(video.scenes[2], 2, 5), "evidence");
assert.strictEqual(detectSegment(video.scenes[3], 3, 5), "reveal");
assert.strictEqual(detectSegment(video.scenes[4], 4, 5), "cta");

const plan = buildMotionPlanForVideo(video);
assert.strictEqual(plan.script_id, "generic_script_001");
assert.strictEqual(plan.total_scenes, 5);
assert.deepStrictEqual(
  plan.scenes.map(scene => scene.motion_type),
  [
    "slow_zoom_in_push_in",
    "slow_pan",
    "subtle_zoom_hold",
    "dramatic_push_in",
    "slow_zoom_out_or_hold"
  ]
);
assert.strictEqual(plan.scenes[0].duration_seconds, 8);
assert.ok(plan.scenes[3].zoom.end_scale > plan.scenes[0].zoom.end_scale);

const batch = buildMotionPlanBatch([video], "modules/video/output/optimized_video_manifest.json");
assert.strictEqual(batch.total_scripts, 1);
assert.strictEqual(batch.summary.total_scenes, 5);
assert.strictEqual(batch.summary.status, "motion_plan_batch_ready");
assert.strictEqual(batch.manifest_source, "modules/video/output/optimized_video_manifest.json");

console.log("Motion planning engine tests passed");
