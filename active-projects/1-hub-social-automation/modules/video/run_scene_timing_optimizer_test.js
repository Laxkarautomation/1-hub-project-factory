const assert = require("assert");
const {
  buildOptimizedVideoManifest,
  buildSceneTimingOptimizationBatch
} = require("./services/scene_timing_optimizer");

function sumDurations(video) {
  return video.scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
}

const baselineManifest = [
  {
    script_id: "research_script_001",
    title: "Test story",
    voice_file: "storage/audio/unraaz/research_script_001.mp3",
    scenes: [
      { scene: 1, duration_seconds: 4, narration: "Hook" },
      { scene: 2, duration_seconds: 6, narration: "Context" },
      { scene: 3, duration_seconds: 8, narration: "Evidence" },
      { scene: 4, duration_seconds: 10, narration: "Reveal" },
      { scene: 5, duration_seconds: 7, narration: "CTA" }
    ]
  }
];

const durationReport = {
  reports: [
    {
      script_id: "research_script_001",
      summary: {
        manifest_total_seconds: 35,
        estimated_total_audio_seconds: 44.79,
        recommended_total_video_seconds: 46,
        status: "audio_duration_major_adjustment_needed"
      },
      scene_matches: [
        { scene: 1, segment: "hook", recommended_duration_seconds: 8, manifest_duration_seconds: 4, estimated_total_audio_seconds: 7.32, duration_diff_seconds: 3.32, duration_status: "duration_needs_minor_adjustment" },
        { scene: 2, segment: "context", recommended_duration_seconds: 11, manifest_duration_seconds: 6, estimated_total_audio_seconds: 10.01, duration_diff_seconds: 4.01, duration_status: "duration_needs_major_adjustment" },
        { scene: 3, segment: "evidence", recommended_duration_seconds: 8, manifest_duration_seconds: 8, estimated_total_audio_seconds: 7.32, duration_diff_seconds: -0.68, duration_status: "duration_matched" },
        { scene: 4, segment: "reveal", recommended_duration_seconds: 12, manifest_duration_seconds: 10, estimated_total_audio_seconds: 11.67, duration_diff_seconds: 1.67, duration_status: "duration_needs_minor_adjustment" },
        { scene: 5, segment: "cta", recommended_duration_seconds: 7, manifest_duration_seconds: 7, estimated_total_audio_seconds: 8.47, duration_diff_seconds: 1.47, duration_status: "duration_matched" }
      ]
    }
  ]
};

const optimized = buildOptimizedVideoManifest(baselineManifest, durationReport);
assert.strictEqual(sumDurations(optimized[0]), 46);
assert.deepStrictEqual(
  optimized[0].scenes.map(scene => scene.duration_seconds),
  [8, 11, 8, 12, 7]
);
assert.deepStrictEqual(
  baselineManifest[0].scenes.map(scene => scene.duration_seconds),
  [4, 6, 8, 10, 7]
);
assert.strictEqual(optimized[0].timing_source, "audio_duration_match_report");

const batch = buildSceneTimingOptimizationBatch(baselineManifest, durationReport);
assert.strictEqual(batch.summary.optimized_scripts, 1);
assert.strictEqual(batch.summary.baseline_total_seconds, 35);
assert.strictEqual(batch.summary.optimized_total_seconds, 46);
assert.strictEqual(batch.optimizations[0].scenes[1].change_seconds, 5);

console.log("Scene timing optimizer tests passed");
