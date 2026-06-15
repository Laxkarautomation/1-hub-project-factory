const fs = require("fs");
const path = require("path");

const routedInputPath = path.join(
  process.cwd(),
  "storage/publishing/unraaz/content_pack.json"
);

const legacyInputPath = path.join(
  process.cwd(),
  "modules/publishing/output/unraaz_content_pack.json"
);

const OUTPUT =
  path.join(process.cwd(),
  "modules/video/output/video_manifest.json");

const INPUT = fs.existsSync(routedInputPath) ? routedInputPath : legacyInputPath;
const packs = JSON.parse(fs.readFileSync(INPUT, "utf8"));

const manifest = packs.map(pack => {

  const scenes = pack.image_prompts.map(scene => ({
    scene: scene.scene,
    duration_seconds:
      parseInt(scene.time.split("-")[1]) -
      parseInt(scene.time.split("-")[0]),
    narration: scene.narration,
    image_prompt: scene.image_prompt
  }));

  return {
    script_id: pack.script_id,
    title: pack.selected_angle,
    voice_file: pack.voice_file,
    caption: pack.caption,
    hashtags: pack.hashtags,
    scenes
  };
});

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(manifest, null, 2)
);

console.log("✅ Video manifest created");
console.log(OUTPUT);
console.log(`Total videos: ${manifest.length}`);
