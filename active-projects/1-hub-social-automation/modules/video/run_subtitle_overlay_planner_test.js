const assert = require("assert");
const {
  buildSubtitleOverlayPlanBatch,
  buildSubtitleOverlayPlanForVideo,
  detectOverlayIssues,
  extractHighlightKeywords,
  selectSubtitleStyle
} = require("./services/subtitle_overlay_planner");

const manifest = [
  {
    script_id: "generic_script_001",
    title: "Test story",
    scenes: [
      {
        scene: 1,
        duration_seconds: 7,
        narration: "A strange case changed everything after one hidden phone call."
      },
      {
        scene: 2,
        duration_seconds: 8,
        narration: "This scene has far too many spoken words packed into a short moment and it needs a cleaner visual plan."
      },
      {
        scene: 3,
        duration_seconds: 9,
        narration: "The secret clue makes the reveal feel closer."
      }
    ]
  }
];

const audioPacingReport = {
  reports: [
    {
      script_id: "generic_script_001",
      pacing: [
        {
          scene: 1,
          segment: "hook",
          word_count: 9,
          pace: "slow",
          target_words_per_second: 1.85,
          estimated_spoken_seconds: 4.86
        },
        {
          scene: 2,
          segment: "context",
          word_count: 20,
          pace: "medium_slow",
          target_words_per_second: 2.05,
          estimated_spoken_seconds: 9.76
        },
        {
          scene: 3,
          segment: "reveal",
          word_count: 8,
          pace: "slow_medium",
          target_words_per_second: 1.95,
          estimated_spoken_seconds: 4.1
        }
      ]
    }
  ]
};

const emotionCueReport = {
  reports: [
    {
      script_id: "generic_script_001",
      cues: [
        {
          scene: 1,
          segment: "hook",
          primary_emotion: "mystery_curiosity",
          emotion_intensity: 86,
          delivery_cue: "pause_before_keyword",
          matched_emotions: [
            { emotion: "mystery_curiosity", intensity: 78, cue: "pause_before_keyword" }
          ]
        },
        {
          scene: 2,
          segment: "context",
          primary_emotion: "neutral_documentary",
          emotion_intensity: 50,
          delivery_cue: "steady_clear_delivery",
          matched_emotions: []
        },
        {
          scene: 3,
          segment: "reveal",
          primary_emotion: "shock_reveal",
          emotion_intensity: 92,
          delivery_cue: "emphasize_reveal",
          matched_emotions: [
            { emotion: "shock_reveal", intensity: 85, cue: "emphasize_reveal" }
          ]
        }
      ]
    }
  ]
};

const retentionReport = {
  reports: [
    {
      script_id: "generic_script_001",
      viewer_drop_risk: "medium",
      recommendations: [
        {
          recommendation_type: "insert_pattern_break",
          scenes: [3],
          priority: "medium"
        },
        {
          recommendation_type: "add_cut",
          scenes: [2],
          priority: "medium"
        }
      ]
    }
  ]
};

assert.strictEqual(selectSubtitleStyle("hook", { emotion_intensity: 86 }), "bold_hook_caption");
assert.deepStrictEqual(
  extractHighlightKeywords("The hidden secret changed this case.", { primary_emotion: "mystery_curiosity" }),
  ["hidden", "secret", "case"]
);

const plan = buildSubtitleOverlayPlanForVideo(
  manifest[0],
  audioPacingReport,
  emotionCueReport,
  retentionReport
);

assert.strictEqual(plan.script_id, "generic_script_001");
assert.strictEqual(plan.total_scenes, 3);
assert.strictEqual(plan.status, "subtitle_overlay_plan_ready");
assert.strictEqual(plan.scenes.length, 3);
assert.ok(plan.scenes.every(scene => scene.subtitle_style));
assert.ok(plan.scenes.every(scene => scene.subtitle_position));
assert.ok(plan.scenes.every(scene => Array.isArray(scene.emphasis_words)));
assert.ok(plan.scenes.every(scene => Array.isArray(scene.highlight_keywords)));
assert.ok(plan.scenes.every(scene => scene.overlay_type));
assert.ok(plan.scenes.every(scene => Number.isInteger(scene.overlay_timing_ms)));
assert.ok(plan.scenes.every(scene => Number.isInteger(scene.overlay_duration_ms)));
assert.ok(plan.scenes.every(scene => Number.isInteger(scene.readability_score)));
assert.ok(plan.scenes[0].emphasis_words.length > 0);
assert.ok(plan.scenes[0].highlight_keywords.includes("hidden"));
assert.strictEqual(plan.scenes[2].overlay_type, "reveal_emphasis");

const issues = detectOverlayIssues(plan.scenes);
assert.ok(issues.some(issue => issue.issue_type === "text_overload"));
assert.ok(issues.some(issue => issue.issue_type === "low_readability"));
assert.ok(issues.some(issue => issue.issue_type === "missing_emphasis_moments"));
assert.ok(issues.some(issue => issue.issue_type === "poor_keyword_highlighting"));

const batch = buildSubtitleOverlayPlanBatch(
  manifest,
  audioPacingReport,
  emotionCueReport,
  retentionReport
);

assert.strictEqual(batch.total_scripts, 1);
assert.strictEqual(batch.summary.status, "subtitle_overlay_plan_batch_ready");
assert.ok(Number.isInteger(batch.summary.average_readability_score));
assert.ok(batch.summary.total_highlight_keywords > 0);
assert.strictEqual(typeof batch.summary.subtitle_density, "number");

console.log("Subtitle overlay planner tests passed");
