const fs = require("fs");
const path = require("path");
const {
  buildDurationMatchBatchReport
} = require("./audio_duration_matcher");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const pacingPath = path.join(process.cwd(), "modules/audio/output/audio_pacing_report.json");
const pausePath = path.join(process.cwd(), "modules/audio/output/pause_breath_report.json");

const manifest = readJson(manifestPath, []);
const pacingReport = readJson(pacingPath, {});
const pauseReport = readJson(pausePath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildDurationMatchBatchReport(manifest, pacingReport, pauseReport);

const outputDir = path.join(process.cwd(), "modules/audio/output");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "audio_duration_match_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Audio duration match report saved:", outputPath);

const first = report.reports[0];
if (first) {
  console.table(first.scene_matches.map(x => ({
    scene: x.scene,
    segment: x.segment,
    manifest: x.manifest_duration_seconds,
    spoken: x.estimated_spoken_seconds,
    pause: x.planned_pause_seconds,
    total: x.estimated_total_audio_seconds,
    diff: x.duration_diff_seconds,
    status: x.duration_status,
    recommended: x.recommended_duration_seconds
  })));
  console.log("First script summary:", first.summary);
}

console.log("Batch summary:", report.summary);
