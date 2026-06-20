const fs = require("fs");
const { readJson, writeJson, runNode, stageReport } = require("./_stage_utils");

function fileReady(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
}

const attempts = [
  runNode("modules/video-renderer/services/render_all_videos.js")
];

const batchReport = readJson("modules/video-renderer/output/batch_render_report.json", null);
const results = Array.isArray(batchReport?.results) ? batchReport.results : [];

const rendered = results.filter(item => item.status === "rendered" && fileReady(item.outputFile));
const skipped = results.filter(item => item.status !== "rendered" || !fileReady(item.outputFile));

const success =
  attempts.every(attempt => attempt.ok) &&
  results.length > 0 &&
  skipped.length === 0 &&
  rendered.length === results.length;

const report = stageReport("video_rendering", {
  success,
  status: success ? "rendered" : "render_failed",
  failureReason: success ? null : "missing_or_skipped_video_outputs",
  attempts,
  outputs: {
    batchRenderReport: Boolean(batchReport),
    path: "modules/video-renderer/output/batch_render_report.json"
  },
  totalVideos: results.length,
  renderedVideos: rendered.length,
  skippedVideos: skipped.length,
  skippedItems: skipped.map(item => ({
    script_id: item.script_id,
    status: item.status,
    reason: item.reason,
    outputFile: item.outputFile,
    reportPath: item.reportPath
  }))
});

writeJson("storage/reports/content-workflow/video_rendering_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));

if (!success) process.exit(1);
