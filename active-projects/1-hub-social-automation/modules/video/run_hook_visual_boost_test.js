const assert = require("assert");
const {
  buildHookVisualBoostBatch,
  buildHookVisualBoostForVideo,
  hookStatus
} = require("./services/hook_visual_boost_engine");

const manifest = [
  {
    script_id: "generic_script_001",
    scenes: [
      {
        scene: 1,
        duration_seconds: 8,
        narration: "A strange village goes silent after sunset.",
        image_prompt: "wide shot, dark cinematic fog, dramatic shadows, high detail"
      },
      { scene: 2, duration_seconds: 10 }
    ]
  }
];

const motionReport = {
  plans: [
    {
      script_id: "generic_script_001",
      scenes: [
        {
          scene: 1,
          segment: "hook",
          motion_type: "slow_zoom_in_push_in",
          camera_move: "push_in",
          zoom: { start_scale: 1.02, end_scale: 1.12 },
          intensity: "slow"
        }
      ]
    }
  ]
};

const transitionReport = {
  plans: [
    {
      script_id: "generic_script_001",
      transitions: [
        {
          from_scene: 1,
          to_scene: 2,
          transition_type: "hard_cut",
          intensity: "sharp"
        }
      ]
    }
  ]
};

assert.strictEqual(hookStatus(84), "strong_hook");
assert.strictEqual(hookStatus(62), "average_hook");
assert.strictEqual(hookStatus(40), "weak_hook");

const boost = buildHookVisualBoostForVideo(manifest[0], motionReport, transitionReport);
assert.strictEqual(boost.script_id, "generic_script_001");
assert.strictEqual(boost.hook_scene, 1);
assert.ok(boost.visual_intensity_score >= 70);
assert.ok(boost.hook_strength_score >= 70);
assert.strictEqual(boost.camera_motion_boost.enabled, true);
assert.strictEqual(boost.contrast_boost.enabled, true);
assert.strictEqual(boost.zoom_boost.enabled, true);
assert.strictEqual(boost.text_overlay_boost.enabled, true);
assert.ok(Number.isInteger(boost.reveal_tease_score));
assert.ok(["weak_hook", "average_hook", "strong_hook"].includes(boost.status));

const batch = buildHookVisualBoostBatch(manifest, motionReport, transitionReport);
assert.strictEqual(batch.total_scripts, 1);
assert.strictEqual(batch.summary.total_hooks, 1);
assert.strictEqual(batch.summary.status, "hook_visual_boost_batch_ready");

console.log("Hook visual boost tests passed");
