const assert = require("assert");

const { buildVisualContext } = require("./core/visual_context_builder");
const { buildStoryboard } = require("./core/storyboard_intelligence");
const {
  scoreSceneContinuity,
  detectDuplicateScenes
} = require("./core/scene_continuity_engine");
const {
  scoreImageRelevance
} = require("./core/image_relevance_scorer");
const {
  scoreVisualRetention
} = require("./core/visual_retention_engine");
const {
  planDocumentaryVisualQuality
} = require("./core/documentary_visual_planner");
const {
  buildVisualRewriteRecommendations,
  detectWeakScenes
} = require("./core/visual_rewrite_engine");

const channel = {
  channelId: "local_finance",
  contentMode: "finance",
  visualStyle: "clean local finance visuals, trust-building, text-free frames, vertical 9:16",
  targetAudience: "loan customers and small business owners",
  contentPillars: ["loan documents", "verification", "financial safety"],
  topicKeywords: ["loan", "documents", "emi"]
};

const brief = {
  topic: "loan document mismatch",
  working_title: "loan document mismatch: warning signs",
  research_context: {
    research_type: "financial_case",
    primary_subject: "loan document mismatch",
    facts: [
      { fact: "Loan documents aur repayment numbers compare karne par mismatch clear hota hai." }
    ],
    entities: [
      { name: "loan documents", score: 0.9 },
      { name: "repayment records", score: 0.8 }
    ]
  },
  documentary_script: {
    version: "phase_26_final_script_generation_v3",
    mode: "risk_breakdown",
    scene_beats: [
      {
        beat: "hook",
        second_range: "0-3",
        narration: "Loan document mismatch me ignored signal sabse badi warning ban gaya.",
        visual_intent: "fast documentary opener"
      },
      {
        beat: "context",
        second_range: "3-7",
        narration: "Numbers aur pressure main angle bane.",
        visual_intent: "context scene, slow push-in"
      },
      {
        beat: "evidence",
        second_range: "12-18",
        narration: "Records aur repayment numbers ka mismatch key evidence tha.",
        visual_intent: "records, highlighted detail"
      },
      {
        beat: "reveal",
        second_range: "23-27",
        narration: "Real issue shuruaat me hi dikh raha tha.",
        visual_intent: "reveal contrast"
      },
      {
        beat: "lesson",
        second_range: "27-30",
        narration: "Risk ignore karna mehngi galti ban sakta hai.",
        visual_intent: "clean closing frame"
      }
    ],
    quality_score: {
      score: 96,
      has_timeline_labels: false
    }
  }
};

const visualContext = buildVisualContext(brief, { channel });
const storyboard = buildStoryboard(brief, visualContext);

const continuity = scoreSceneContinuity(storyboard);
assert.ok(continuity.score >= 85);
assert.strictEqual(continuity.has_continuity_anchor, true);
assert.strictEqual(continuity.has_style_lock, true);
assert.strictEqual(continuity.duplicate_scenes.length, 0);

const relevance = scoreImageRelevance(storyboard);
assert.ok(relevance.score >= 85);
assert.strictEqual(relevance.has_narration_alignment, true);
assert.strictEqual(relevance.weak_scenes.length, 0);

const retention = scoreVisualRetention(storyboard);
assert.ok(retention.score >= 85);
assert.strictEqual(retention.has_hook_visual, true);
assert.strictEqual(retention.has_reveal_visual, true);
assert.strictEqual(retention.has_retention_progression, true);

const quality = planDocumentaryVisualQuality(storyboard, { channel });
assert.ok(quality.documentary_visual_quality_score >= 85);
assert.strictEqual(quality.scene_continuity.score, continuity.score);
assert.strictEqual(quality.image_relevance.score, relevance.score);
assert.strictEqual(quality.visual_retention.score, retention.score);
assert.strictEqual(quality.status, "visual_quality_ready");

const duplicatedStoryboard = {
  ...storyboard,
  scenes: storyboard.scenes.map((scene, index) => index === 1
    ? { ...scene, image_prompt: storyboard.scenes[0].image_prompt }
    : scene)
};
const duplicateReport = detectDuplicateScenes(duplicatedStoryboard.scenes);
assert.strictEqual(duplicateReport.length, 1);
assert.strictEqual(duplicateReport[0].scene, 2);

const weakStoryboard = {
  ...storyboard,
  scenes: storyboard.scenes.map((scene, index) => index === 2
    ? {
      ...scene,
      image_prompt: "generic cinematic frame, vertical 9:16",
      continuity_anchor: ""
    }
    : scene)
};
const weakScenes = detectWeakScenes(weakStoryboard);
assert.strictEqual(weakScenes.length, 1);
assert.strictEqual(weakScenes[0].scene, 3);

const rewrites = buildVisualRewriteRecommendations(weakStoryboard, { channel });
assert.strictEqual(rewrites.status, "rewrite_recommendations_ready");
assert.ok(rewrites.recommendations.length >= 1);
assert.ok(rewrites.recommendations[0].recommended_prompt.includes("loan document mismatch"));
assert.ok(rewrites.recommendations[0].recommended_prompt.includes("vertical 9:16"));
assert.ok(!JSON.stringify(rewrites).includes(["UN", "RAAZ"].join("")));

console.log(JSON.stringify({
  success: true,
  phase: "27B-visual-intelligence-quality-engines",
  quality_score: quality.documentary_visual_quality_score,
  rewrite_recommendations: rewrites.recommendations.length
}, null, 2));
