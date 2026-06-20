const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../../channels/channel_workspace_resolver");
const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");

const channelIdentity = getActiveChannelIdentity();
const channelId = channelIdentity.channelId;

const workspace = workspaceResolver.getWorkspace();
const routedInputPath = workspace.getPublishingPath("content_pack.json");
const legacyInputPath = path.join(process.cwd(), "modules/publishing/output/" + channelId + "_content_pack.json");
const outputPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function parseDuration(scene = {}) {
  if (Number.isFinite(Number(scene.duration_seconds))) {
    return Math.max(1, Number(scene.duration_seconds));
  }

  const match = String(scene.time || "").match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return 4;

  return Math.max(1, Number(match[2]) - Number(match[1]));
}

function normalizeScene(scene = {}) {
  return {
    scene: scene.scene,
    beat: scene.beat,
    duration_seconds: parseDuration(scene),
    narration: scene.narration,
    image_prompt: scene.image_prompt,
    visual_intent: scene.visual_intent,
    shot_type: scene.shot_type,
    retention_role: scene.retention_role,
    continuity_anchor: scene.continuity_anchor
  };
}

function buildVideoManifest(packs = []) {
  return toArray(packs).map(pack => ({
    script_id: pack.script_id,
    title: pack.selected_angle || pack.title || pack.topic || "documentary story",
    source: pack.source || "content_pack",
    voice_file: pack.voice_file,
    caption: pack.caption,
    hashtags: pack.hashtags || [],
    visual_quality: pack.visual_quality || null,
    scenes: toArray(pack.image_prompts).map(normalizeScene)
  }));
}

function resolveInputPath(options = {}) {
  if (options.inputPath) return options.inputPath;
  return fs.existsSync(routedInputPath) ? routedInputPath : legacyInputPath;
}

function loadContentPack(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function run(options = {}) {
  const input = resolveInputPath(options);
  const packs = options.packs || loadContentPack(input);
  const manifest = buildVideoManifest(packs);
  const target = options.outputPath || outputPath;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2));

  console.log("Video manifest created");
  console.log(target);
  console.log(`Total videos: ${manifest.length}`);

  return manifest;
}

if (require.main === module) {
  run();
}

module.exports = {
  buildVideoManifest,
  normalizeScene,
  parseDuration,
  run
};
