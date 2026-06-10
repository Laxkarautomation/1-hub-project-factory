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

fs.mkdirSync(outputDir, { recursive: true });

const durations = [4, 6, 8, 10, 7];

let listContent = "";

for (let i = 1; i <= 5; i++) {
  const imagePath = path.join(imageDir, `scene_${i}.jpg`);
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Missing image: ${imagePath}`);
    process.exit(1);
  }

  listContent += `file '${imagePath}'\n`;
  listContent += `duration ${durations[i - 1]}\n`;
}

// ffmpeg concat needs last image repeated
listContent += `file '${path.join(imageDir, "scene_5.jpg")}'\n`;

fs.writeFileSync(listFile, listContent);

const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -i "${audioFile}" -vf "scale=720:1280,format=yuv420p" -c:v libx264 -c:a aac -shortest "${outputFile}"`;

console.log("Rendering video...");
execSync(cmd, { stdio: "inherit" });

console.log("✅ Video rendered:");
console.log(outputFile);
