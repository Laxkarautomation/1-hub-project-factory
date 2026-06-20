const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildImagePromptPacks
} = require("../images/services/generate_scene_varied_prompts");
const {
  buildContentPack
} = require("../publishing/services/export_content_pack");
const {
  buildVideoManifest
} = require("../video/services/build_video_manifest");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "visual-pipeline-"));
}

const storyboardReport = {
  version: "phase_27a_visual_storyboards",
  status: "visual_storyboards_ready",
  channelId: "local_finance",
  storyboards: [
    {
      version: "phase_27a_storyboard_intelligence",
      status: "storyboard_ready",
      script_id: "visual_script_001",
      topic: "loan document mismatch",
      working_title: "loan document mismatch warning",
      visual_context: {
        topic: "loan document mismatch",
        subject_anchor: "loan document mismatch",
        visual_style: "clean local finance visuals, trust-building, vertical 9:16",
        channel: {
          channelId: "local_finance",
          visualStyle: "clean local finance visuals, trust-building, vertical 9:16"
        },
        evidence: {
          evidence_objects: ["loan documents", "repayment records"]
        }
      },
      scenes: [
        {
          scene: 1,
          beat: "hook",
          time: "0-3",
          duration_seconds: 3,
          narration: "Loan document mismatch me warning shuruaat me dikh rahi thi.",
          shot_type: "opening hook frame",
          retention_role: "stop scroll",
          image_prompt: "opening hook frame, loan document mismatch, fast documentary opener, clean local finance visuals, vertical 9:16, photorealistic documentary frame, no readable text, no watermark"
        },
        {
          scene: 2,
          beat: "evidence",
          time: "12-18",
          duration_seconds: 6,
          narration: "Records aur repayment numbers ka mismatch key evidence tha.",
          shot_type: "evidence insert shot",
          retention_role: "make claim concrete",
          image_prompt: "evidence insert shot, loan document mismatch, loan documents, records highlighted detail, clean local finance visuals, vertical 9:16, photorealistic documentary frame, no readable text, no watermark"
        },
        {
          scene: 3,
          beat: "reveal",
          time: "23-27",
          duration_seconds: 4,
          narration: "Real issue shuruaat me hi dikh raha tha.",
          shot_type: "reveal contrast shot",
          retention_role: "deliver turn",
          image_prompt: "reveal contrast shot, loan document mismatch, repayment records, reveal contrast, clean local finance visuals, vertical 9:16, photorealistic documentary frame, no readable text, no watermark"
        }
      ]
    }
  ]
};

const promptPacks = buildImagePromptPacks({
  visualStoryboards: storyboardReport,
  scripts: [],
  channel: { channelId: "local_finance" }
});

assert.strictEqual(promptPacks.source, "phase_27_visual_storyboards");
assert.strictEqual(promptPacks.items.length, 1);
assert.strictEqual(promptPacks.items[0].script_id, "visual_script_001");
assert.strictEqual(promptPacks.items[0].scenes.length, 3);
assert.ok(promptPacks.items[0].visual_quality.documentary_visual_quality_score >= 80);
assert.ok(promptPacks.items[0].scenes[0].image_prompt.includes("loan document mismatch"));

const captions = [
  {
    script_id: "visual_script_001",
    caption: "Loan document mismatch warning",
    hashtags: ["#Finance"],
    platform: ["youtube_short"]
  }
];
const contentPack = buildContentPack({
  visualStoryboards: storyboardReport,
  imagePromptPacks: promptPacks.items,
  scripts: [],
  captions,
  workspace: {
    getAudioPath(filename = "") {
      return path.join("storage/audio/local_finance", filename);
    }
  }
});

assert.strictEqual(contentPack.source, "phase_27_visual_storyboards");
assert.strictEqual(contentPack.items.length, 1);
assert.strictEqual(contentPack.items[0].image_prompts[1].beat, "evidence");
assert.strictEqual(contentPack.items[0].visual_quality.documentary_visual_quality_score, promptPacks.items[0].visual_quality.documentary_visual_quality_score);

const manifest = buildVideoManifest(contentPack.items);
assert.strictEqual(manifest.length, 1);
assert.strictEqual(manifest[0].script_id, "visual_script_001");
assert.strictEqual(manifest[0].scenes[0].duration_seconds, 3);
assert.strictEqual(manifest[0].scenes[1].duration_seconds, 6);
assert.strictEqual(manifest[0].scenes[2].duration_seconds, 4);
assert.ok(manifest[0].scenes[1].image_prompt.includes("loan documents"));
assert.strictEqual(manifest[0].visual_quality.documentary_visual_quality_score, promptPacks.items[0].visual_quality.documentary_visual_quality_score);

const legacyScripts = [
  {
    script_id: "legacy_script_001",
    sub_theme: "general_mystery",
    selected_angle: "Legacy story",
    script: [
      { time: "0-3", text: "Legacy narration." }
    ]
  }
];
const legacyPacks = buildImagePromptPacks({
  visualStoryboards: { storyboards: [] },
  scripts: legacyScripts,
  channel: { channelId: "legacy_channel", visualStyle: "legacy visual style" }
});

assert.strictEqual(legacyPacks.source, "legacy_script_templates");
assert.strictEqual(legacyPacks.items[0].script_id, "legacy_script_001");
assert.strictEqual(legacyPacks.items[0].scenes[0].narration, "Legacy narration.");

const tmp = makeTempDir();
fs.rmSync(tmp, { recursive: true, force: true });

console.log(JSON.stringify({
  success: true,
  phase: "27C-visual-pipeline-integration",
  source: promptPacks.source,
  manifestScenes: manifest[0].scenes.length
}, null, 2));
