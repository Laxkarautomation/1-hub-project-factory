const { execSync } = require("child_process");

const steps = [
  "node providers/youtube/services/collect_multi_channels.js",
  "node providers/youtube/services/normalize_all_youtube.js",
  "node modules/analytics/services/filter_relevant_videos.js",
  "node modules/analytics/services/create_top_ideas_input.js",
  "node modules/analytics/services/extract_story_angles.js",
  "node modules/research/services/extract_research_notes.js",
  "node modules/scripts/services/generate_research_scripts.js",
  "node modules/images/services/generate_scene_varied_prompts.js",
  "node modules/captions/services/generate_captions.js",
  "node providers/edge-tts/services/generate_voice.js",
  "node modules/publishing/services/export_content_pack.js",
  "node modules/video/services/build_video_manifest.js",
  "node modules/video/services/build_shot_list.js",
  "node providers/image-providers/services/export_image_jobs.js"
];

for (const step of steps) {
  console.log(`\n▶ Running: ${step}`);
  try {
    execSync(step, { stdio: "inherit" });
  } catch (err) {
    console.error(`❌ Failed at: ${step}`);
    process.exit(1);
  }
}

console.log("\n✅ Daily UNRAAZ research pipeline completed successfully");
