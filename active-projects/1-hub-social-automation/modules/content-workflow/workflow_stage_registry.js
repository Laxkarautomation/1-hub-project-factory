const STAGES = [
  {
    key: "competitor_tracking",
    name: "Competitor Tracking",
    candidates: [
      "modules/content-workflow/stages/run_competitor_tracking_stage.js",
      "modules/intelligence/services/build_competitor_intelligence.js",
      "modules/competitors/services/normalizer.js"
    ]
  },
  {
    key: "research",
    name: "Research",
    candidates: [
      "modules/content-workflow/stages/run_research_stage.js",
      "modules/research/services/extract_research_notes.js"
    ]
  },
  {
    key: "script_generation",
    name: "Script Generation",
    candidates: [
      "modules/content-workflow/stages/run_script_generation_stage.js",
      "modules/intelligence/services/generate_scripts_from_briefs.js",
      "modules/scripts/services/generate_research_scripts.js"
    ]
  },
  {
    key: "image_generation",
    name: "Image Generation",
    candidates: [
      "modules/content-workflow/stages/run_image_generation_stage.js",
      "modules/image-factory/run_image_factory.js"
    ]
  },
  {
    key: "tts_generation",
    name: "TTS Generation",
    candidates: [
      "modules/content-workflow/stages/run_tts_generation_stage.js",
      "modules/providers/run_audio_runtime_test.js"
    ]
  },
  {
    key: "video_rendering",
    name: "Video Rendering",
    candidates: [
      "modules/content-workflow/stages/run_video_render_stage.js",
      "modules/video-renderer/services/render_all_videos.js"
    ]
  }
];

module.exports = { STAGES };
