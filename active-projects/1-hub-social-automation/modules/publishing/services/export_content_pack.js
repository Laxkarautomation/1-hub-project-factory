const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../../channels/channel_workspace_resolver");

const intelligenceScriptsPath = path.join(__dirname, "../../intelligence/output/generated_unraaz_scripts.json");
const researchScriptsPath = path.join(__dirname, "../../scripts/output/unraaz_research_scripts.json");
const imagesPath = path.join(__dirname, "../../images/output/unraaz_varied_image_prompts.json");
const captionsPath = path.join(__dirname, "../../captions/output/unraaz_captions.json");

const workspace = workspaceResolver.getWorkspace();
const outputPath = workspace.getPublishingPath("content_pack.json");

function loadScripts() {
  if (fs.existsSync(intelligenceScriptsPath)) {
    const report = JSON.parse(fs.readFileSync(intelligenceScriptsPath, "utf-8"));
    return Array.isArray(report) ? report : (report.scripts || report.items || []);
  }

  return JSON.parse(fs.readFileSync(researchScriptsPath, "utf-8"));
}

function run() {
  const scripts = loadScripts();
  const images = JSON.parse(fs.readFileSync(imagesPath, "utf-8"));
  const captions = JSON.parse(fs.readFileSync(captionsPath, "utf-8"));

  const pack = scripts.map(script => {
    const imagePack = images.find(i => i.script_id === script.script_id);
    const captionPack = captions.find(c => c.script_id === script.script_id);

    return {
      script_id: script.script_id,
      sub_theme: script.sub_theme || script.subTheme || "general_mystery",
      selected_angle: script.selected_angle || script.working_title || script.topic || "UNRAAZ mystery story",

      script: script.script,

      voice_file: workspace.getAudioPath(`${script.script_id}.mp3`),

      image_prompts: imagePack?.scenes || [],

      caption: captionPack?.caption || "",
      hashtags: captionPack?.hashtags || [],
      platforms: captionPack?.platform || [],

      status: "upload_ready_pack"
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2));

  console.log("✅ UNRAAZ content pack exported:");
  console.log(outputPath);
  console.log(`Total packs: ${pack.length}`);
}

run();
