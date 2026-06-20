const fs = require("fs");
const path = require("path");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

write("modules/audio/audio_pacing_engine.js", `function wordCount(text = "") {
  return String(text || "").trim().split(/\\s+/).filter(Boolean).length;
}

function detectSegment(scene = {}, index = 0, total = 5) {
  const sceneNo = Number(scene.scene || index + 1);

  if (sceneNo === 1) return "hook";
  if (sceneNo === total) return "cta";
  if (sceneNo === total - 1) return "reveal";
  if (sceneNo === 2) return "context";
  return "evidence";
}

const PACING_RULES = {
  hook: {
    pace: "slow",
    speedMultiplier: 0.90,
    targetWordsPerSecond: 1.85,
    reason: "slow hook improves suspense and first-second clarity"
  },
  context: {
    pace: "medium_slow",
    speedMultiplier: 0.96,
    targetWordsPerSecond: 2.05,
    reason: "context should stay clear but not drag"
  },
  evidence: {
    pace: "medium",
    speedMultiplier: 1.00,
    targetWordsPerSecond: 2.15,
    reason: "evidence section needs balanced delivery"
  },
  reveal: {
    pace: "slow_medium",
    speedMultiplier: 0.94,
    targetWordsPerSecond: 1.95,
    reason: "reveal needs tension and breathing room"
  },
  cta: {
    pace: "medium_fast",
    speedMultiplier: 1.08,
    targetWordsPerSecond: 2.30,
    reason: "CTA should be quick and energetic"
  }
};

function buildScenePacing(scene = {}, index = 0, total = 5, voiceProfile = {}) {
  const segment = detectSegment(scene, index, total);
  const rule = PACING_RULES[segment] || PACING_RULES.evidence;
  const profileSpeed = Number(voiceProfile.speedMultiplier || 1);
  const combinedSpeed = Number((rule.speedMultiplier * profileSpeed).toFixed(2));

  const words = wordCount(scene.narration || "");
  const estimatedSeconds = rule.targetWordsPerSecond
    ? Number((words / rule.targetWordsPerSecond).toFixed(2))
    : 0;

  return {
    scene: scene.scene || index + 1,
    segment,
    narration: scene.narration || "",
    word_count: words,
    manifest_duration_seconds: Number(scene.duration_seconds || 0),
    pace: rule.pace,
    segment_speed_multiplier: rule.speedMultiplier,
    voice_profile_speed_multiplier: profileSpeed,
    final_speed_multiplier: combinedSpeed,
    target_words_per_second: rule.targetWordsPerSecond,
    estimated_spoken_seconds: estimatedSeconds,
    pacing_reason: rule.reason
  };
}

function buildAudioPacingReport(script = {}, voiceProfileItem = {}) {
  const scenes = script.scenes || [];
  const voiceProfile = voiceProfileItem.profile || {};
  const pacing = scenes.map((scene, index) =>
    buildScenePacing(scene, index, scenes.length, voiceProfile)
  );

  const totalWords = pacing.reduce((sum, x) => sum + x.word_count, 0);
  const manifestDuration = pacing.reduce((sum, x) => sum + x.manifest_duration_seconds, 0);
  const estimatedSpokenDuration = Number(
    pacing.reduce((sum, x) => sum + x.estimated_spoken_seconds, 0).toFixed(2)
  );

  return {
    generated_at: new Date().toISOString(),
    script_id: script.script_id || script.scriptId,
    selected_voice_profile: voiceProfileItem.selected_profile || voiceProfile.id || "unknown",
    summary: {
      total_scenes: pacing.length,
      total_words: totalWords,
      manifest_duration_seconds: manifestDuration,
      estimated_spoken_seconds: estimatedSpokenDuration,
      average_words_per_scene: pacing.length ? Math.round(totalWords / pacing.length) : 0,
      status: "audio_pacing_resolved"
    },
    pacing
  };
}

function buildAudioPacingBatchReport(scripts = [], voiceProfileReport = {}) {
  const profiles = voiceProfileReport.profiles || [];

  const reports = scripts.map(script => {
    const profile = profiles.find(x => x.script_id === (script.script_id || script.scriptId)) || {};
    return buildAudioPacingReport(script, profile);
  });

  return {
    generated_at: new Date().toISOString(),
    total_scripts: reports.length,
    status: "audio_pacing_batch_resolved",
    reports
  };
}

module.exports = {
  PACING_RULES,
  wordCount,
  detectSegment,
  buildScenePacing,
  buildAudioPacingReport,
  buildAudioPacingBatchReport
};
`);

write("modules/audio/run_audio_pacing_audit.js", `const fs = require("fs");
const path = require("path");
const {
  buildAudioPacingBatchReport
} = require("./audio_pacing_engine");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");
const voiceProfilePath = path.join(process.cwd(), "modules/audio/output/voice_profile_report.json");

const manifest = readJson(manifestPath, []);
const voiceProfileReport = readJson(voiceProfilePath, {});

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error("Missing video manifest:", manifestPath);
  process.exit(1);
}

const report = buildAudioPacingBatchReport(manifest, voiceProfileReport);

const outputDir = path.join(process.cwd(), "modules/audio/output");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "audio_pacing_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Audio pacing report saved:", outputPath);

const first = report.reports[0];
if (first) {
  console.table(first.pacing.map(x => ({
    scene: x.scene,
    segment: x.segment,
    words: x.word_count,
    duration: x.manifest_duration_seconds,
    pace: x.pace,
    speed: x.final_speed_multiplier,
    estimated: x.estimated_spoken_seconds
  })));
  console.log("First script summary:", first.summary);
}

console.log("Batch summary:", {
  total_scripts: report.total_scripts,
  status: report.status
});
`);
