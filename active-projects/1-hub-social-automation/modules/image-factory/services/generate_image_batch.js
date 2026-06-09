const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  process.cwd(),
  "modules/video/output/shot_list.json"
);

const outputDir = path.join(
  process.cwd(),
  "storage/exports/image-batches"
);

fs.mkdirSync(outputDir, { recursive: true });

function run() {
  const shotLists = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  shotLists.slice(0, 3).forEach(video => {
    const lines = [];

    lines.push(`UNRAAZ IMAGE BATCH`);
    lines.push(`Script ID: ${video.script_id}`);
    lines.push(`Title: ${video.title}`);
    lines.push(`Format: Vertical 9:16`);
    lines.push(`Style: Dark cinematic realistic documentary`);
    lines.push(``);

    video.shots.forEach(shot => {
      lines.push(`SCENE ${shot.scene}`);
      lines.push(`Duration: ${shot.duration_seconds}s`);
      lines.push(`Narration: ${shot.narration}`);
      lines.push(`Prompt: ${shot.visual_prompt}`);
      lines.push(`Edit Note: ${shot.edit_note}`);
      lines.push(``);
    });

    lines.push(`Caption:`);
    lines.push(video.caption);
    lines.push(``);
    lines.push(`Hashtags:`);
    lines.push(video.hashtags.join(" "));

    const outputPath = path.join(outputDir, `${video.script_id}_image_batch.txt`);
    fs.writeFileSync(outputPath, lines.join("\n"));

    console.log(`✅ Image batch exported: ${outputPath}`);
  });

  console.log("✅ Manual image batches ready");
}

run();
