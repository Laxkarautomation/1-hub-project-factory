const fs = require("fs");
const path = require("path");

const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");
const { planDocumentaryVisualQuality } = require("../../intelligence/core/documentary_visual_planner");
const { buildVisualRewriteRecommendations } = require("../../intelligence/core/visual_rewrite_engine");

const channelIdentity = getActiveChannelIdentity();
const channelId = channelIdentity.channelId;
const visualStoryboardsPath = path.join(process.cwd(), "modules/intelligence/output/visual_storyboards.json");
const intelligenceScriptsPath = path.join(process.cwd(), "modules/intelligence/output/generated_" + channelId + "_scripts.json");
const researchScriptsPath = path.join(process.cwd(), "modules/scripts/output/" + channelId + "_research_scripts.json");
const outputPath = path.join(process.cwd(), "modules/images/output/" + channelId + "_varied_image_prompts.json");

const style = "vertical 9:16, dark cinematic realistic documentary style, moody lighting, dramatic shadows, high detail, no text, no watermark, no gore";

const sceneTemplates = {
  haunted_village: [
    "wide shot of abandoned Indian village at sunset, empty lanes, fog",
    "old villagers standing far away in shadows, worried faces, rural India",
    "dark narrow village path with broken temple bell and warning atmosphere",
    "close-up of empty doorway, moving curtain, eerie night mood",
    "lonely village road under moonlight, suspense ending frame"
  ],
  haunted_house: [
    "wide shot of old abandoned Indian mansion at night",
    "locked wooden door inside old house, dust and moonlight",
    "dark room with cracked walls and faint light from window",
    "close-up of staircase shadows and mysterious footsteps mood",
    "empty hallway fading into darkness, suspense ending frame"
  ],
  haunted_object: [
    "old room with antique object on wooden table, candle light",
    "family photo frames blurred in background, object in focus",
    "close-up of mysterious object with dramatic shadows",
    "object lying alone after room is emptied, eerie silence",
    "dark table with object half-lit, final mystery mood"
  ],
  true_crime: [
    "dark investigation desk with case files and old phone",
    "evidence board with blurred photos and red strings, no readable text",
    "close-up of ringing old telephone in dim light",
    "shadow of investigator standing near file cabinet",
    "empty interrogation room with single chair, suspense ending"
  ],
  survival_disaster: [
    "wide shot of remote crash site in foggy mountains",
    "survivors' abandoned supplies near broken airplane parts, no bodies",
    "cold forest rescue scene, distant emergency light",
    "close-up of damaged aircraft metal in snow or mud",
    "lonely crash site under dark sky, survival mystery mood"
  ],
  general_mystery: [
    "shadowy figure walking on foggy road at night",
    "old newspaper clippings on table, no readable text",
    "dark room with single lamp and hidden file",
    "close-up of mysterious hand opening old box",
    "foggy empty road disappearing into darkness"
  ]
};

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function resolveChannel() {
  const result = resolveChannelRuntime();
  return result.success ? result.channel : { channelId };
}

function loadScripts(options = {}) {
  if (options.scripts) return options.scripts;

  const intelligence = readJsonIfExists(intelligenceScriptsPath);
  if (intelligence) {
    return Array.isArray(intelligence) ? intelligence : (intelligence.scripts || intelligence.items || []);
  }

  return readJsonIfExists(researchScriptsPath, []);
}

function loadVisualStoryboards(options = {}) {
  if (options.visualStoryboards) return options.visualStoryboards;
  return readJsonIfExists(visualStoryboardsPath, null);
}

function fallbackScriptId(index = 0) {
  return `${channelId}_visual_script_${String(index + 1).padStart(3, "0")}`;
}

function normalizeStoryboardScene(scene = {}, rewriteByScene = new Map()) {
  const rewrite = rewriteByScene.get(scene.scene);

  return {
    scene: scene.scene,
    beat: scene.beat,
    time: scene.time,
    duration_seconds: scene.duration_seconds,
    narration: scene.narration,
    visual_intent: scene.visual_intent,
    shot_type: scene.shot_type,
    retention_role: scene.retention_role,
    continuity_anchor: scene.continuity_anchor,
    image_prompt: rewrite?.recommended_prompt || scene.image_prompt,
    original_image_prompt: rewrite ? scene.image_prompt : undefined,
    rewrite_applied: Boolean(rewrite)
  };
}

function normalizeStoryboardForQuality(storyboard = {}) {
  const subjectAnchor = storyboard.visual_context?.continuity?.subject_lock ||
    storyboard.visual_context?.subject_anchor ||
    storyboard.topic ||
    "";

  return {
    ...storyboard,
    scenes: toArray(storyboard.scenes).map(scene => ({
      ...scene,
      continuity_anchor: scene.continuity_anchor || subjectAnchor
    }))
  };
}

function buildFromStoryboards(storyboards = [], options = {}) {
  const channel = options.channel || resolveChannel();

  return toArray(storyboards).map((storyboard, index) => {
    const normalizedStoryboard = normalizeStoryboardForQuality(storyboard);
    const visualQuality = planDocumentaryVisualQuality(normalizedStoryboard, { channel });
    const rewrites = buildVisualRewriteRecommendations(normalizedStoryboard, { channel });
    const rewriteByScene = new Map(
      rewrites.recommendations.map(item => [item.scene, item])
    );
    const scriptId = storyboard.script_id || storyboard.scriptId || fallbackScriptId(index);

    return {
      script_id: scriptId,
      topic: normalizedStoryboard.topic || normalizedStoryboard.visual_context?.topic || "",
      selected_angle: normalizedStoryboard.working_title || normalizedStoryboard.topic || "documentary story",
      source: "phase_27_visual_storyboard",
      visual_context: normalizedStoryboard.visual_context || {},
      visual_quality: visualQuality,
      rewrite_recommendations: rewrites.recommendations,
      scenes: toArray(normalizedStoryboard.scenes).map(scene => normalizeStoryboardScene(scene, rewriteByScene)),
      status: "visual_storyboard_image_prompts_ready"
    };
  });
}

function buildFromLegacyScripts(scripts = [], options = {}) {
  const channel = options.channel || {};
  const fallbackStyle = [
    channel.visualStyle,
    style
  ].filter(Boolean).join(", ");

  return toArray(scripts).map(script => {
    const subTheme = script.sub_theme || script.subTheme || "general_mystery";
    const selectedAngle = script.selected_angle || script.working_title || script.topic || "documentary story";
    const templates = sceneTemplates[subTheme] || sceneTemplates.general_mystery;

    return {
      script_id: script.script_id,
      sub_theme: subTheme,
      selected_angle: selectedAngle,
      source: "legacy_script_templates",
      scenes: toArray(script.script).map((line, index) => ({
        scene: index + 1,
        time: line.time,
        narration: line.text || line.narration || "",
        image_prompt: `${templates[index] || templates[0]}, ${fallbackStyle}`
      })),
      status: "varied_image_prompts_ready"
    };
  });
}

function buildImagePromptPacks(options = {}) {
  const visualStoryboards = loadVisualStoryboards(options);
  const storyboards = toArray(visualStoryboards?.storyboards);

  if (storyboards.length) {
    return {
      source: "phase_27_visual_storyboards",
      items: buildFromStoryboards(storyboards, options)
    };
  }

  return {
    source: "legacy_script_templates",
    items: buildFromLegacyScripts(loadScripts(options), options)
  };
}

function run(options = {}) {
  const result = buildImagePromptPacks(options);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result.items, null, 2));

  console.log("Varied image prompts generated");
  console.log(outputPath);
  console.log(`Source: ${result.source}`);
  console.log(`Total packs: ${result.items.length}`);

  return result;
}

if (require.main === module) {
  run();
}

module.exports = {
  buildImagePromptPacks,
  buildFromStoryboards,
  buildFromLegacyScripts,
  loadScripts,
  run
};
