const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../modules/images/output/unraaz_varied_image_prompts.json"
);

const outputDir = path.join(
  __dirname,
  "../../../storage/images/unraaz"
);

fs.mkdirSync(outputDir, { recursive: true });

function safeName(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function downloadImage(url, filePath) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Image download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
}

async function run() {
  const packs = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  // V1: sirf first script ke 5 images
  const pack = packs[0];
  const scriptDir = path.join(outputDir, pack.script_id);
  fs.mkdirSync(scriptDir, { recursive: true });

  for (const scene of pack.scenes) {
    const encodedPrompt = encodeURIComponent(scene.image_prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=720&height=1280&seed=${scene.scene}&nologo=true`;

    const fileName = `scene_${scene.scene}_${safeName(pack.sub_theme)}.jpg`;
    const filePath = path.join(scriptDir, fileName);

    console.log(`Downloading scene ${scene.scene}...`);
    await downloadImage(url, filePath);
    console.log(`✅ Saved: ${filePath}`);
  }

  console.log("✅ Images generated for:");
  console.log(pack.script_id);
}

run().catch(err => {
  console.error("❌ Pollinations image generation failed:");
  console.error(err.message);
  process.exit(1);
});
