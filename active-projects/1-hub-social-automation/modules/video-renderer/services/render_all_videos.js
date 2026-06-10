const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { checkVideoAssets } = require("./preflight_video_assets");

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const outputRouter = require("../../channels/channel_output_router");
const outputDir = outputRouter.getVideoOutputPath();
const reportDir = path.join(process.cwd(), "modules/video-renderer/output");

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

function writePreflightReport(scriptId, preflight) {
  const reportPath = path.join(reportDir, `${scriptId}_preflight_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(preflight, null, 2));
  return reportPath;
}

function renderVideo(video) {
  const scriptId = video.script_id;
  const imageDir = outputRouter.getImageOutputPath(scriptId);
  const audioFile = path.join(process.cwd(), video.voice_file);
  const outputFile = path.join(outputDir, `${scriptId}.mp4`);
  const listFile = path.join(outputDir, `${scriptId}_images.txt`);

  const preflight = checkVideoAssets(video);
  const reportPath = writePreflightReport(scriptId, preflight);

  if (!preflight.ok) {
    console.log(`⚠️ Skipping ${scriptId}: preflight failed`);
    console.log(`Report: ${reportPath}`);
    console.table(preflight.issues.map(issue => ({
      type: issue.type,
      scene: issue.scene || "",
      path: issue.path
    })));
    return {
      script_id: scriptId,
      status: "skipped",
      reason: "preflight_failed",
      reportPath
    };
  }

  let listContent = "";

  for (const scene of video.scenes) {
    const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);
    listContent += `file '${imagePath}'\n`;
    listContent += `duration ${scene.duration_seconds}\n`;
  }

  const lastScene = video.scenes[video.scenes.length - 1];
  listContent += `file '${path.join(imageDir, `scene_${lastScene.scene}.jpg`)}'\n`;

  fs.writeFileSync(listFile, listContent);

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -i "${audioFile}" -vf "scale=720:1280,format=yuv420p" -c:v libx264 -c:a aac -shortest "${outputFile}"`;

  console.log(`🎬 Rendering ${scriptId}...`);
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Rendered: ${outputFile}`);

  return {
    script_id: scriptId,
    status: "rendered",
    outputFile,
    reportPath
  };
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const results = manifest.map(renderVideo);

  const batchReportPath = path.join(reportDir, "batch_render_report.json");
  fs.writeFileSync(batchReportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    results
  }, null, 2));

  console.log(`✅ Batch render complete`);
  console.log(`Batch report: ${batchReportPath}`);
}

run();
