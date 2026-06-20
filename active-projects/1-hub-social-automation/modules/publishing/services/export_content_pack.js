const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../../channels/channel_workspace_resolver");
const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");

const channelIdentity = getActiveChannelIdentity();
const channelId = channelIdentity.channelId;

const visualStoryboardsPath = path.join(process.cwd(), "modules/intelligence/output/visual_storyboards.json");
const intelligenceScriptsPath = path.join(process.cwd(), "modules/intelligence/output/generated_" + channelId + "_scripts.json");
const researchScriptsPath = path.join(process.cwd(), "modules/scripts/output/" + channelId + "_research_scripts.json");
const imagesPath = path.join(process.cwd(), "modules/images/output/" + channelId + "_varied_image_prompts.json");
const captionsPath = path.join(process.cwd(), "modules/captions/output/" + channelId + "_captions.json");

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function loadScripts(options = {}) {
  if (options.scripts) return options.scripts;

  const intelligence = readJsonIfExists(intelligenceScriptsPath);
  if (intelligence) {
    return Array.isArray(intelligence) ? intelligence : (intelligence.scripts || intelligence.items || []);
  }

  return readJsonIfExists(researchScriptsPath, []);
}

function loadImagePromptPacks(options = {}) {
  if (options.imagePromptPacks) return options.imagePromptPacks;
  return readJsonIfExists(imagesPath, []);
}

function loadCaptions(options = {}) {
  if (options.captions) return options.captions;
  return readJsonIfExists(captionsPath, []);
}

function loadVisualStoryboards(options = {}) {
  if (options.visualStoryboards) return options.visualStoryboards;
  return readJsonIfExists(visualStoryboardsPath, null);
}

function fallbackScriptId(index = 0) {
  return `${channelId}_visual_script_${String(index + 1).padStart(3, "0")}`;
}

function captionFor(captions = [], scriptId = "") {
  return toArray(captions).find(item => item.script_id === scriptId) || {};
}

function promptPackFor(packs = [], scriptId = "") {
  return toArray(packs).find(item => item.script_id === scriptId) || {};
}

function buildFromVisualStoryboards(storyboards = [], imagePromptPacks = [], captions = [], workspace = workspaceResolver.getWorkspace()) {
  return toArray(storyboards).map((storyboard, index) => {
    const scriptId = storyboard.script_id || storyboard.scriptId || fallbackScriptId(index);
    const imagePack = promptPackFor(imagePromptPacks, scriptId);
    const captionPack = captionFor(captions, scriptId);
    const scenes = toArray(imagePack.scenes).length ? imagePack.scenes : toArray(storyboard.scenes);

    return {
      script_id: scriptId,
      topic: storyboard.topic || storyboard.visual_context?.topic || "",
      selected_angle: storyboard.working_title || storyboard.topic || "documentary story",
      source: "phase_27_visual_storyboard",
      script: scenes.map(scene => ({
        time: scene.time,
        text: scene.narration
      })),
      voice_file: workspace.getAudioPath(`${scriptId}.mp3`),
      image_prompts: scenes,
      visual_context: storyboard.visual_context || imagePack.visual_context || {},
      visual_quality: imagePack.visual_quality || storyboard.visual_quality || null,
      rewrite_recommendations: imagePack.rewrite_recommendations || [],
      caption: captionPack.caption || storyboard.working_title || storyboard.topic || "",
      hashtags: captionPack.hashtags || [],
      platforms: captionPack.platform || captionPack.platforms || [],
      status: "upload_ready_pack"
    };
  });
}

function buildFromLegacyScripts(scripts = [], imagePromptPacks = [], captions = [], workspace = workspaceResolver.getWorkspace()) {
  return toArray(scripts).map(script => {
    const imagePack = promptPackFor(imagePromptPacks, script.script_id);
    const captionPack = captionFor(captions, script.script_id);

    return {
      script_id: script.script_id,
      sub_theme: script.sub_theme || script.subTheme || "general_mystery",
      selected_angle: script.selected_angle || script.working_title || script.topic || "documentary story",
      source: "legacy_script_pack",
      script: script.script,
      voice_file: workspace.getAudioPath(`${script.script_id}.mp3`),
      image_prompts: imagePack.scenes || [],
      visual_quality: imagePack.visual_quality || null,
      caption: captionPack.caption || "",
      hashtags: captionPack.hashtags || [],
      platforms: captionPack.platform || captionPack.platforms || [],
      status: "upload_ready_pack"
    };
  });
}

function buildContentPack(options = {}) {
  const workspace = options.workspace || workspaceResolver.getWorkspace();
  const visualStoryboards = loadVisualStoryboards(options);
  const storyboards = toArray(visualStoryboards?.storyboards);
  const imagePromptPacks = loadImagePromptPacks(options);
  const captions = loadCaptions(options);

  if (storyboards.length) {
    return {
      source: "phase_27_visual_storyboards",
      items: buildFromVisualStoryboards(storyboards, imagePromptPacks, captions, workspace)
    };
  }

  return {
    source: "legacy_script_pack",
    items: buildFromLegacyScripts(loadScripts(options), imagePromptPacks, captions, workspace)
  };
}

function run(options = {}) {
  const workspace = options.workspace || workspaceResolver.getWorkspace();
  const outputPath = workspace.getPublishingPath("content_pack.json");
  const result = buildContentPack({ ...options, workspace });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result.items, null, 2));

  console.log("Content pack exported");
  console.log(outputPath);
  console.log(`Source: ${result.source}`);
  console.log(`Total packs: ${result.items.length}`);

  return result;
}

if (require.main === module) {
  run();
}

module.exports = {
  buildContentPack,
  buildFromVisualStoryboards,
  buildFromLegacyScripts,
  run
};
