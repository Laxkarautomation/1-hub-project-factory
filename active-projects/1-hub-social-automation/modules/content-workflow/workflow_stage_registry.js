const path = require("path");

const STAGES = [
  {
    key: "competitor_tracking",
    name: "Competitor Tracking",
    candidates: [
      "modules/competitors/run_competitor_tracking.js",
      "modules/competitor-tracking/run_competitor_tracking.js",
      "modules/youtube/run_youtube_competitor_tracker.js"
    ]
  },
  {
    key: "research",
    name: "Research",
    candidates: [
      "modules/research/run_research_pipeline.js",
      "modules/research/run_research.js",
      "run_research_pipeline.js"
    ]
  },
  {
    key: "script_generation",
    name: "Script Generation",
    candidates: [
      "modules/script-generator/run_script_generation.js",
      "modules/script-generator/run_script_generator.js",
      "modules/scripts/run_script_generator.js"
    ]
  },
  {
    key: "image_generation",
    name: "Image Generation",
    candidates: [
      "modules/image-factory/run_image_factory.js",
      "modules/image-factory/run_image_jobs.js"
    ]
  },
  {
    key: "tts_generation",
    name: "TTS Generation",
    candidates: [
      "modules/tts/run_tts.js",
      "modules/voice/run_tts.js",
      "modules/audio/run_tts.js"
    ]
  },
  {
    key: "video_rendering",
    name: "Video Rendering",
    candidates: [
      "modules/video-renderer/run_video_renderer.js",
      "modules/video-renderer/run_batch_render.js"
    ]
  }
];

module.exports = { STAGES };
