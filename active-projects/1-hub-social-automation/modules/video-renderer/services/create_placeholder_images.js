const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");

function safeText(text) {
  return text
    .replace(/"/g, "")
    .replace(/'/g, "")
    .slice(0, 40);
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  for (const video of manifest) {
    const imageDir = path.join(process.cwd(), `storage/images/unraaz/${video.script_id}`);
    fs.mkdirSync(imageDir, { recursive: true });

    for (const scene of video.scenes) {
      const output = path.join(imageDir, `scene_${scene.scene}.jpg`);
      const text = safeText(`${video.script_id}\nScene ${scene.scene}`);

      const cmd = `convert -size 720x1280 gradient:black-gray -gravity center -fill white -pointsize 42 -annotate 0 "${text}" "${output}"`;

      execSync(cmd);
    }

    console.log(`✅ Placeholder images created: ${video.script_id}`);
  }

  console.log("✅ All placeholder images ready");
}

run();
