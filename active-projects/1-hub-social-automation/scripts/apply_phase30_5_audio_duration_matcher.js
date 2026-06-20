const fs = require("fs");
const path = require("path");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

write("modules/audio/audio_duration_matcher.js", `function round2(value = 0) {
  return Number(Number(value || 0).toFixed(2));
}

function clamp(value, min, max) {
  const n = Number(value || 0);
  return Math.max(min, Math.min(max, n));
}

function durationStatus(diffSeconds = 0) {
  const abs = Math.abs(diffSeconds);
  if (abs <= 1.5) return "duration_matched";
  if (abs <= 4) return "duration_needs_minor_adjustment";
  return "duration_needs_major_adjustment";
}

function buildSceneDurationMatch(pacingItem = {}, pausePlan = {}) {
  const manifestDuration = Number(pacingItem.manifest_duration_seconds || 0);
  const spokenSeconds = Number(pacingItem.estimated_spoken_seconds || 0);
  const pauseSeconds = Number((pausePlan.total_pause_ms || 0) / 1000);
  const estimatedTotal = round2(spokenSeconds + pauseSeconds);
  const diff = round2(estimatedTotal - manifestDuration);

  let recommendedAction = "keep_duration";
  let recommendedDuration = manifestDuration;

  if (diff > 1.5) {
    recommendedAction = "extend_scene_duration_or_speed_up_voice";
    recommendedDuration = Math.ceil(estimatedTotal);
  } else if (diff < -1.5) {
    recommendedAction = "shorten_scene_duration_or_add_pause";
    recommendedDuration = Math.max(1, Math.ceil(estimatedTotal));
  }

  const speedAdjustmentNeeded = manifestDuration > 0
    ? round2(clamp(estimatedTotal / manifestDuration, 0.75, 1.35))
    : 1;

  return {
    scene: pacingItem.scene,
    segment: pacingItem.segment,
    manifest_duration_seconds: manifestDuration,
    estimated_spoken_seconds: spokenSeconds,
    planned_pause_seconds: round2(pauseSeconds),
    estimated_total_audio_seconds: estimatedTotal,
    duration_diff_seconds: diff,
    duration_status: durationStatus(diff),
    recommended_action: recommendedAction,
    recommended_duration_seconds: recommendedDuration,
    speed_adjustment_factor: speedAdjustmentNeeded
  };
}

function buildDurationMatchReportForScript(script = {}, pacingReport = {}, pauseReport = {}) {
  const pacing = pacingReport.pacing || [];
  const plans = pauseReport.plans || [];

  const scene_matches = pacing.map(item => {
    const pause = plans.find(x => x.scene === item.scene) || {};
    return buildSceneDurationMatch(item, pause);
  });

  const manifestTotal = round2(scene_matches.reduce((sum, x) => sum + x.manifest_duration_seconds, 0));
  const estimatedTotal = round2(scene_matches.reduce((sum, x) => sum + x.estimated_total_audio_seconds, 0));
  const totalDiff = round2(estimatedTotal - manifestTotal);

  const recommendedTotal = scene_matches.reduce((sum, x) => sum + x.recommended_duration_seconds, 0);

  const major = scene_matches.filter(x => x.duration_status === "duration_needs_major_adjustment").length;
  const minor = scene_matches.filter(x => x.duration_status === "duration_needs_minor_adjustment").length;

  let status = "audio_duration_matched";
  if (major > 0) status = "audio_duration_major_adjustment_needed";
  else if (minor > 0) status = "audio_duration_minor_adjustment_needed";

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    summary: {
      total_scenes: scene_matches.length,
      manifest_total_seconds: manifestTotal,
      estimated_total_audio_seconds: estimatedTotal,
      total_duration_diff_seconds: totalDiff,
      recommended_total_video_seconds: recommendedTotal,
      major_adjustments: major,
      minor_adjustments: minor,
      status
    },
    scene_matches
  };
}

function buildDurationMatchBatchReport(scripts = [], pacingBatch = {}, pauseBatch = {}) {
  const pacingReports = pacingBatch.reports || [];
  const pauseReports = pauseBatch.reports || [];

  const reports = scripts.map(script => {
    const scriptId = script.script_id || script.scriptId;
    const pacing = pacingReports.find(x => x.script_id === scriptId) || {};
    const pause = pauseReports.find(x => x.script_id === scriptId) || {};
    return buildDurationMatchReportForScript(script, pacing, pause);
  });

  const majorScripts = reports.filter(x => x.summary.status === "audio_duration_major_adjustment_needed").length;
  const minorScripts = reports.filter(x => x.summary.status === "audio_duration_minor_adjustment_needed").length;

  return {
    generated_at: new Date().toISOString(),
    total_scripts: reports.length,
    summary: {
      major_scripts: majorScripts,
      minor_scripts: minorScripts,
      matched_scripts: reports.length - majorScripts - minorScripts,
      status: majorScripts > 0
        ? "batch_audio_duration_major_adjustment_needed"
        : minorScripts > 0
          ? "batch_audio_duration_minor_adjustment_needed"
          : "batch_audio_duration_matched"
    },
    reports
  };
}

module.exports = {
  buildSceneDurationMatch,
  buildDurationMatchReportForScript,
  buildDurationMatchBatchReport
};
`);

write("modules/audio/run_audio_duration_matcher.js", `const fs = require("fs");
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
`);
