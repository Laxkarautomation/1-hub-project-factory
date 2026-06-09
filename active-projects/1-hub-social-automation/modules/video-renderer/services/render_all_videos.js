const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const outputDir = path.join(process.cwd(), "storage/videos/unraaz");

fs.mkdirSync(outputDir, { recursive: true });

function renderVideo(video) {
  const scriptId = video.script_id;
  const imageDir = path.join(process.cwd(), `storage/images/unraaz/${scriptId}`);
  const audioFile = path.join(process.cwd(), video.voice_file);
  const outputFile = path.join(outputDir, `${scriptId}.mp4`);
  const listFile = path.join(outputDir, `${scriptId}_images.txt`);

  if (!fs.existsSync(audioFile)) {
    console.log(`⚠️ Skipping ${scriptId}: missing audio`);
    return;
  }

  let listContent = "";

  for (const scene of video.scenes) {
    const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);

    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️ Skipping ${scriptId}: missing image scene_${scene.scene}.jpg`);
      return;
    }

    listContent += `file '${imagePath}'\n`;
    listContent += `duration ${scene.duration_seconds}\n`;
  }

  listContent += `file '${path.join(imageDir, "scene_5.jpg")}'\n`;
  fs.writeFileSync(listFile, listContent);

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -i "${audioFile}" -vf "scale=720:1280,format=yuv420p" -c:v libx264 -c:a aac -shortest "${outputFile}"`;

  console.log(`🎬 Rendering ${scriptId}...`);
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Rendered: ${outputFile}`);
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  manifest.forEach(renderVideo);
  console.log("✅ Batch render complete");
}

run();
