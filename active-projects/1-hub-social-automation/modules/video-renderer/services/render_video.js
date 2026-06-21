const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const scriptId = "research_script_001";

const outputRouter = require("../../channels/channel_output_router");
const imageDir = outputRouter.getImageOutputPath(scriptId);
const audioFile = path.join(outputRouter.getAudioOutputPath(), `${scriptId}.mp3`);
const outputDir = outputRouter.getVideoOutputPath();
const outputFile = path.join(outputDir, `${scriptId}.mp4`);
const listFile = path.join(outputDir, `${scriptId}_images.txt`);
const optimizedManifestPath = path.join(process.cwd(), "modules/video/output/optimized_video_manifest.json");
const baselineManifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");

fs.mkdirSync(outputDir, { recursive: true });

function loadScenes() {
  const manifestPath = fs.existsSync(optimizedManifestPath)
    ? optimizedManifestPath
    : baselineManifestPath;

  if (!fs.existsSync(manifestPath)) {
    return [1, 2, 3, 4, 5].map(scene => ({
      scene,
      duration_seconds: 4
    }));
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const video = manifest.find(item => item.script_id === scriptId);
  return video?.scenes?.length
    ? video.scenes
    : [1, 2, 3, 4, 5].map(scene => ({
      scene,
      duration_seconds: 4
    }));
}

let listContent = "";
const scenes = loadScenes();

for (const scene of scenes) {
  const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Missing image: ${imagePath}`);
    process.exit(1);
  }

  listContent += `file '${imagePath}'\n`;
  listContent += `duration ${scene.duration_seconds}\n`;
}

// ffmpeg concat needs last image repeated
const lastScene = scenes[scenes.length - 1];
listContent += `file '${path.join(imageDir, `scene_${lastScene.scene}.jpg`)}'\n`;

fs.writeFileSync(listFile, listContent);

const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -i "${audioFile}" -vf "scale=720:1280,format=yuv420p" -c:v libx264 -c:a aac -shortest "${outputFile}"`;

console.log("Rendering video...");
execSync(cmd, { stdio: "inherit" });

console.log("✅ Video rendered:");
console.log(outputFile);
