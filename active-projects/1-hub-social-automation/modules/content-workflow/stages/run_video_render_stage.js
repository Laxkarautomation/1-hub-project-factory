const { readJson, writeJson, runNode, stageReport } = require("./_stage_utils");

const attempts = [
  runNode("modules/video-renderer/services/render_all_videos.js")
];

const batchReport = readJson("modules/video-renderer/output/batch_render_report.json", null);

const report = stageReport("video_rendering", {
  success: true,
  attempts,
  outputs: {
    batchRenderReport: Boolean(batchReport),
    path: "modules/video-renderer/output/batch_render_report.json"
  }
});

writeJson("storage/reports/content-workflow/video_rendering_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));
