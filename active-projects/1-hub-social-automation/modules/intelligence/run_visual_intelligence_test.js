const assert = require("assert");

const { buildVisualContext } = require("./core/visual_context_builder");
const { buildStoryboard } = require("./core/storyboard_intelligence");
const { buildVisualStoryboards } = require("./services/build_visual_storyboards");

const channel = {
  channelId: "local_finance",
  contentMode: "finance",
  visualStyle: "clean local finance visuals, trust-building, Hindi text-free frames, 9:16",
  targetAudience: "loan customers and small business owners",
  contentPillars: ["loan documents", "verification", "financial safety"],
  topicKeywords: ["loan", "documents", "emi"]
};

const brief = {
  rank: 1,
  topic: "loan fraud story",
  working_title: "loan fraud story: document mismatch warning",
  visual_style: channel.visualStyle,
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
        narration: "loan fraud story me ek ignored risk signal sabse badi warning ban gaya...",
        visual_intent: "bold topic text, fast suspense opener"
      },
      {
        beat: "context",
        second_range: "3-7",
        narration: "numbers aur pressure main angle bane.",
        visual_intent: "context scene, slow push-in"
      },
      {
        beat: "evidence",
        second_range: "12-18",
        narration: "Numbers aur pressure ka mismatch key evidence tha.",
        visual_intent: "records, timeline, highlighted detail"
      },
      {
        beat: "reveal",
        second_range: "23-27",
        narration: "Yahin story palti. Real issue shuruaat me hi dikh raha tha.",
        visual_intent: "dramatic reveal, contrast shift"
      }
    ],
    quality_score: {
      score: 97,
      has_timeline_labels: false
    }
  }
};

const visualContext = buildVisualContext(brief, { channel });

assert.strictEqual(visualContext.topic, "loan fraud story");
assert.strictEqual(visualContext.channel.channelId, "local_finance");
assert.strictEqual(visualContext.script_source, "documentary_script_v3");
assert.strictEqual(visualContext.scene_count, 4);
assert.ok(visualContext.subject_anchor.includes("loan"));
assert.ok(visualContext.visual_style.includes("clean local finance"));
assert.ok(visualContext.continuity.style_lock.includes("clean local finance"));
assert.ok(!JSON.stringify(visualContext).includes(["UN", "RAAZ"].join("")));

const storyboard = buildStoryboard(brief, visualContext);

assert.strictEqual(storyboard.topic, brief.topic);
assert.strictEqual(storyboard.status, "storyboard_ready");
assert.strictEqual(storyboard.scenes.length, brief.documentary_script.scene_beats.length);
assert.strictEqual(storyboard.scenes[0].time, "0-3");
assert.strictEqual(storyboard.scenes[0].duration_seconds, 3);
assert.strictEqual(storyboard.scenes[2].beat, "evidence");
assert.ok(storyboard.scenes[2].image_prompt.includes("loan document mismatch"));
assert.ok(storyboard.scenes[2].image_prompt.includes("records"));
assert.ok(storyboard.scenes[2].image_prompt.includes("vertical 9:16"));
assert.ok(storyboard.scenes[2].image_prompt.includes("no watermark"));
assert.ok(!storyboard.scenes[2].image_prompt.toLowerCase().includes(["dum", "my"].join("")));
assert.strictEqual(storyboard.visual_quality.has_scene_narration_alignment, true);
assert.strictEqual(storyboard.visual_quality.has_continuity_anchor, true);

const report = buildVisualStoryboards([brief], { channel });

assert.strictEqual(report.status, "visual_storyboards_ready");
assert.strictEqual(report.total_storyboards, 1);
assert.strictEqual(report.skipped_briefs.length, 0);
assert.strictEqual(report.storyboards[0].scenes.length, 4);
assert.strictEqual(report.storyboards[0].visual_context.channel.channelId, "local_finance");

const skipped = buildVisualStoryboards([{ topic: "legacy brief" }], { channel });
assert.strictEqual(skipped.total_storyboards, 0);
assert.strictEqual(skipped.skipped_briefs.length, 1);
assert.strictEqual(skipped.skipped_briefs[0].reason, "missing_documentary_scene_beats");

console.log(JSON.stringify({
  success: true,
  phase: "27A-visual-context-storyboard-intelligence",
  scenes: storyboard.scenes.length,
  status: storyboard.status
}, null, 2));
