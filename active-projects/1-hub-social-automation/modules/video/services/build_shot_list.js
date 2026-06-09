const fs = require("fs");
const path = require("path");

const inputPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const outputPath = path.join(process.cwd(), "modules/video/output/shot_list.json");

function editNote(sceneIndex) {
  const notes = [
    "slow zoom in, dark fade from black",
    "slight camera push, add low suspense ambience",
    "quick cut, add subtle shadow movement",
    "slow zoom close-up, increase tension",
    "fade out with question text overlay"
  ];

  return notes[sceneIndex - 1] || "cinematic slow movement";
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const shotList = manifest.map(video => ({
    script_id: video.script_id,
    title: video.title,
    voice_file: video.voice_file,
    total_duration_seconds: video.scenes.reduce((sum, s) => sum + s.duration_seconds, 0),
    shots: video.scenes.map(scene => ({
      scene: scene.scene,
      duration_seconds: scene.duration_seconds,
      narration: scene.narration,
      visual_prompt: scene.image_prompt,
      edit_note: editNote(scene.scene)
    })),
    caption: video.caption,
    hashtags: video.hashtags,
    status: "editor_ready"
  }));

  fs.writeFileSync(outputPath, JSON.stringify(shotList, null, 2));

  console.log("✅ Shot list created");
  console.log(outputPath);
  console.log(`Total shot lists: ${shotList.length}`);
}

run();
