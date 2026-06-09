const fs = require("fs");
const path = require("path");

const inputPath = path.join(process.cwd(), "modules/video/output/shot_list.json");
const outputPath = path.join(process.cwd(), "storage/exports/image-jobs.json");

function run() {
  const shotLists = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const jobs = [];

  shotLists.slice(0, 3).forEach(video => {
    video.shots.forEach(shot => {
      jobs.push({
        job_id: `${video.script_id}_scene_${shot.scene}`,
        script_id: video.script_id,
        scene: shot.scene,
        duration_seconds: shot.duration_seconds,
        prompt: shot.visual_prompt,
        output_path: `storage/images/unraaz/${video.script_id}/scene_${shot.scene}.jpg`,
        provider_status: "pending",
        provider: "manual_or_future_ai"
      });
    });
  });

  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));

  console.log("✅ Image jobs exported:");
  console.log(outputPath);
  console.log(`Total image jobs: ${jobs.length}`);
}

run();
