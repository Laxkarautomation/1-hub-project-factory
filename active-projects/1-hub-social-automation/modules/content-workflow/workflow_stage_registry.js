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
    key: "voice_profile_resolution",
    name: "Voice Profile Resolution",
    candidates: [
      "modules/audio/run_voice_profile_resolver.js"
    ]
  },
  {
    key: "audio_pacing",
    name: "Audio Pacing",
    candidates: [
      "modules/audio/run_audio_pacing_audit.js"
    ]
  },
  {
    key: "emotion_cue",
    name: "Emotion Cue",
    candidates: [
      "modules/audio/run_emotion_cue_audit.js"
    ]
  },
  {
    key: "pause_breath",
    name: "Pause Breath",
    candidates: [
      "modules/audio/run_pause_breath_audit.js"
    ]
  },
  {
    key: "audio_duration_matching",
    name: "Audio Duration Matching",
    candidates: [
      "modules/audio/run_audio_duration_matcher.js"
    ]
  },
  {
    key: "audio_rerender_decision",
    name: "Audio Rerender Decision",
    candidates: [
      "modules/audio/run_audio_rerender_decision.js"
    ]
  },
  {
    key: "scene_timing_optimization",
    name: "Scene Timing Optimization",
    candidates: [
      "modules/video/run_scene_timing_optimizer.js"
    ]
  },
  {
    key: "motion_planning",
    name: "Motion Planning",
    candidates: [
      "modules/video/run_motion_planning_engine.js"
    ]
  },
  {
    key: "transition_intelligence",
    name: "Transition Intelligence",
    candidates: [
      "modules/video/run_transition_intelligence.js"
    ]
  },
  {
    key: "hook_visual_boost",
    name: "Hook Visual Boost",
    candidates: [
      "modules/video/run_hook_visual_boost.js"
    ]
  },
  {
    key: "retention_cut_pattern",
    name: "Retention Cut Pattern",
    candidates: [
      "modules/video/run_retention_cut_pattern.js"
    ]
  },
  {
    key: "subtitle_overlay_planning",
    name: "Subtitle Overlay Planning",
    candidates: [
      "modules/video/run_subtitle_overlay_planner.js"
    ]
  },
  {
    key: "video_rendering",
    name: "Video Rendering",
    candidates: [
      "modules/content-workflow/stages/run_video_render_stage.js",
      "modules/video-renderer/services/render_all_videos.js"
    ]
  },
  {
    key: "final_render_quality_audit",
    name: "Final Render Quality Audit",
    candidates: [
      "modules/video/run_final_render_quality_audit.js"
    ]
  },
  {
    key: "video_rerender_decision",
    name: "Video Rerender Decision",
    candidates: [
      "modules/video/run_video_rerender_decision.js"
    ]
  }
];

module.exports = { STAGES };
