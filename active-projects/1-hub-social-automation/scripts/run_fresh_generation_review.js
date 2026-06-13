const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { executeProvider } = require("../modules/providers/core/provider_resolver");
const { runQualityEngine } = require("../modules/content-quality");

const ROOT = process.cwd();
const channelId = "unraaz";
const scriptId = "fresh_script_001";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function cleanJsonText(text = "") {
  return String(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

async function main() {
  const baseDir = path.join(ROOT, "storage/fresh-generation", scriptId);
  const imageDir = path.join(ROOT, "storage/images", channelId, scriptId);
  const audioDir = path.join(ROOT, "storage/audio", channelId);
  const videoDir = path.join(ROOT, "storage/videos", channelId);

  fs.rmSync(baseDir, { recursive: true, force: true });
  fs.rmSync(imageDir, { recursive: true, force: true });
  fs.rmSync(path.join(audioDir, `${scriptId}.mp3`), { force: true });
  fs.rmSync(path.join(videoDir, `${scriptId}.mp4`), { force: true });
  fs.rmSync(path.join(videoDir, `${scriptId}_images.txt`), { force: true });

  ensureDir(baseDir);
  ensureDir(imageDir);
  ensureDir(audioDir);
  ensureDir(videoDir);

  console.log("1/4 Generating real script with provider runtime...");

  const prompt = `
Create one Hindi/Hinglish YouTube Shorts mystery script for UNRAAZ.
Return ONLY valid JSON, no markdown.
Topic style: real mystery, suspense, dark documentary, Indian audience.
Need exactly 5 scenes.

JSON schema:
{
  "title": "...",
  "caption": "...",
  "hashtags": ["#UNRAAZ", "..."],
  "scenes": [
    {
      "scene": 1,
      "duration_seconds": 5,
      "narration": "...",
      "image_prompt": "vertical 9:16 cinematic realistic image prompt, no text, no watermark, no gore"
    }
  ]
}
`;

  const scriptResult = await executeProvider("script", { prompt });

  if (!scriptResult.success) {
    throw new Error("Script generation failed: " + JSON.stringify(scriptResult, null, 2));
  }

  const text = scriptResult.result?.text || "";
  const parsed = JSON.parse(cleanJsonText(text));

  if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== 5) {
    throw new Error("Script JSON must contain exactly 5 scenes");
  }

  let manifestItem = {
    script_id: scriptId,
    title: parsed.title,
    voice_file: `storage/audio/${channelId}/${scriptId}.mp3`,
    caption: parsed.caption,
    hashtags: parsed.hashtags || ["#UNRAAZ"],
    scenes: parsed.scenes.map((s, i) => ({
      scene: i + 1,
      duration_seconds: Number(s.duration_seconds || 5),
      narration: String(s.narration || "").trim(),
      image_prompt: String(s.image_prompt || "").trim()
    }))
  };

  console.log("Applying content quality engine...");
  manifestItem = runQualityEngine({ ...manifestItem, channel: "UNRAAZ" }, { verbose: false });
  writeJson(path.join(baseDir, "script.json"), manifestItem);

  console.log("2/4 Generating 5 real images...");

  for (const scene of manifestItem.scenes) {
    const outputPath = path.join(imageDir, `scene_${scene.scene}.jpg`);
    const imageResult = await executeProvider("image", {
      script_id: scriptId,
      scene: scene.scene,
      prompt: scene.image_prompt,
      outputPath
    });

    if (!imageResult.success || !fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error(`Image scene_${scene.scene} failed: ` + JSON.stringify(imageResult, null, 2));
    }

    console.log(`  scene_${scene.scene}.jpg OK`);
  }

  console.log("3/4 Generating real audio...");

  const narrationText = manifestItem.scenes.map((s) => s.narration).join("\n\n");
  const audioPath = path.join(audioDir, `${scriptId}.mp3`);

  const audioResult = await executeProvider("audio", {
    text: narrationText,
    outputPath: audioPath
  });

  if (!audioResult.success || !fs.existsSync(audioPath) || fs.statSync(audioPath).size < 1000) {
    throw new Error("Audio generation failed: " + JSON.stringify(audioResult, null, 2));
  }

  console.log("4/4 Rendering video...");

  const listFile = path.join(videoDir, `${scriptId}_images.txt`);
  const videoPath = path.join(videoDir, `${scriptId}.mp4`);

  let listContent = "";
  for (const scene of manifestItem.scenes) {
    const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);
    listContent += `file '${imagePath}'\n`;
    listContent += `duration ${scene.duration_seconds}\n`;
  }
  listContent += `file '${path.join(imageDir, "scene_5.jpg")}'\n`;

  fs.writeFileSync(listFile, listContent);

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -i "${audioPath}" -vf "scale=720:1280,format=yuv420p" -c:v libx264 -c:a aac -shortest "${videoPath}"`;
  execSync(cmd, { stdio: "inherit" });

  const report = {
    success: true,
    scriptId,
    script: path.join(baseDir, "script.json"),
    images: imageDir,
    audio: audioPath,
    video: videoPath,
    generatedAt: new Date().toISOString()
  };

  writeJson(path.join(baseDir, "fresh_generation_report.json"), report);

  console.log("\n✅ FRESH GENERATION COMPLETE");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("\n❌ FRESH GENERATION FAILED");
  console.error(error.message);
  process.exit(1);
});
