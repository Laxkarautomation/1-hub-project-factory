function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function round2(value = 0) {
  return Number(Number(value || 0).toFixed(2));
}

function duration(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.round(n));
}

function findDurationReport(durationReport = {}, scriptId) {
  return toArray(durationReport.reports).find(report => report.script_id === scriptId) || null;
}

function findSceneMatch(scriptReport = {}, sceneNumber) {
  return toArray(scriptReport.scene_matches).find(match => Number(match.scene) === Number(sceneNumber)) || null;
}

function optimizeScene(scene = {}, sceneMatch = null) {
  const baselineDuration = duration(scene.duration_seconds);
  const optimizedDuration = sceneMatch
    ? duration(sceneMatch.recommended_duration_seconds, baselineDuration)
    : baselineDuration;

  return {
    ...scene,
    duration_seconds: optimizedDuration,
    baseline_duration_seconds: baselineDuration,
    timing_source: sceneMatch ? "audio_duration_match_report" : "video_manifest"
  };
}

function buildSceneOptimization(scene = {}, optimizedScene = {}, sceneMatch = null) {
  const baselineDuration = duration(scene.duration_seconds);
  const optimizedDuration = duration(optimizedScene.duration_seconds, baselineDuration);

  return {
    scene: scene.scene,
    segment: sceneMatch?.segment || null,
    baseline_duration_seconds: baselineDuration,
    optimized_duration_seconds: optimizedDuration,
    change_seconds: optimizedDuration - baselineDuration,
    estimated_total_audio_seconds: sceneMatch?.estimated_total_audio_seconds ?? null,
    duration_diff_seconds: sceneMatch?.duration_diff_seconds ?? null,
    duration_status: sceneMatch?.duration_status || "duration_source_missing",
    source: sceneMatch ? "audio_duration_match_report" : "video_manifest"
  };
}

function optimizeVideo(video = {}, durationReport = {}) {
  const scriptId = video.script_id || video.scriptId;
  const scriptReport = findDurationReport(durationReport, scriptId);
  const optimizedScenes = toArray(video.scenes).map(scene =>
    optimizeScene(scene, findSceneMatch(scriptReport, scene.scene))
  );

  const baselineTotal = toArray(video.scenes).reduce((sum, scene) => sum + duration(scene.duration_seconds), 0);
  const optimizedTotal = optimizedScenes.reduce((sum, scene) => sum + duration(scene.duration_seconds), 0);

  return {
    optimizedVideo: {
      ...video,
      scenes: optimizedScenes,
      baseline_total_duration_seconds: baselineTotal,
      optimized_total_duration_seconds: optimizedTotal,
      timing_source: scriptReport ? "audio_duration_match_report" : "video_manifest"
    },
    optimization: {
      script_id: scriptId,
      baseline_total_seconds: baselineTotal,
      optimized_total_seconds: optimizedTotal,
      recommended_total_video_seconds: scriptReport?.summary?.recommended_total_video_seconds ?? null,
      estimated_total_audio_seconds: scriptReport?.summary?.estimated_total_audio_seconds ?? null,
      total_change_seconds: optimizedTotal - baselineTotal,
      status: scriptReport
        ? "scene_timing_optimized"
        : "scene_timing_source_missing",
      scenes: toArray(video.scenes).map((scene, index) =>
        buildSceneOptimization(scene, optimizedScenes[index], findSceneMatch(scriptReport, scene.scene))
      )
    }
  };
}

function buildOptimizedVideoManifest(manifest = [], durationReport = {}) {
  return toArray(manifest).map(video => optimizeVideo(video, durationReport).optimizedVideo);
}

function buildSceneTimingOptimizationBatch(manifest = [], durationReport = {}) {
  const optimizations = toArray(manifest).map(video => optimizeVideo(video, durationReport).optimization);
  const baselineTotal = optimizations.reduce((sum, item) => sum + item.baseline_total_seconds, 0);
  const optimizedTotal = optimizations.reduce((sum, item) => sum + item.optimized_total_seconds, 0);
  const optimizedScripts = optimizations.filter(item => item.status === "scene_timing_optimized").length;

  return {
    generated_at: new Date().toISOString(),
    total_scripts: optimizations.length,
    summary: {
      optimized_scripts: optimizedScripts,
      source_missing_scripts: optimizations.length - optimizedScripts,
      baseline_total_seconds: round2(baselineTotal),
      optimized_total_seconds: round2(optimizedTotal),
      total_change_seconds: round2(optimizedTotal - baselineTotal),
      status: optimizedScripts === optimizations.length
        ? "scene_timing_batch_optimized"
        : "scene_timing_batch_partial"
    },
    optimizations
  };
}

module.exports = {
  buildOptimizedVideoManifest,
  buildSceneTimingOptimizationBatch,
  optimizeScene,
  optimizeVideo
};
