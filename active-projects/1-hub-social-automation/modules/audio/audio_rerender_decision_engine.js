function clampScore(value = 0) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreDurationAlignment(summary = {}) {
  const diff = Math.abs(Number(summary.total_duration_diff_seconds || 0));
  if (diff <= 1.5) return 100;
  if (diff <= 4) return 80;
  if (diff <= 8) return 60;
  if (diff <= 12) return 45;
  return 30;
}

function decideAudioRerender({ scriptId, voice = {}, pacing = {}, emotion = {}, pause = {}, duration = {} }) {
  const durationScore = scoreDurationAlignment(duration.summary || {});
  const emotionScore = clampScore(emotion.summary?.average_emotion_intensity || 65);
  const pauseScore = clampScore(100 - Math.max(0, ((pause.summary?.average_pause_ms || 0) - 650) / 5));
  const pacingScore = pacing.summary?.status === "audio_pacing_resolved" ? 85 : 50;
  const voiceScore = voice.selected_profile ? 90 : 55;

  const finalScore = clampScore(
    voiceScore * 0.20 +
    pacingScore * 0.20 +
    emotionScore * 0.20 +
    pauseScore * 0.15 +
    durationScore * 0.25
  );

  const reasons = [];
  if (durationScore < 65) reasons.push("duration_mismatch");
  if (pauseScore < 65) reasons.push("pause_timing_too_heavy");
  if (emotionScore < 60) reasons.push("weak_emotion_cues");
  if (!voice.selected_profile) reasons.push("missing_voice_profile");

  let decision = "approve_audio";
  if (durationScore < 50) decision = "rerender_or_retime_required";
  else if (reasons.length > 0 || finalScore < 75) decision = "review_audio_timing";

  return {
    script_id: scriptId,
    voice_profile: voice.selected_profile || "unknown",
    voice_score: voiceScore,
    pacing_score: pacingScore,
    emotion_score: emotionScore,
    pause_score: pauseScore,
    duration_score: durationScore,
    final_audio_readiness_score: finalScore,
    decision,
    rerender_required: decision === "rerender_or_retime_required",
    review_required: decision !== "approve_audio",
    reasons,
    recommended_total_video_seconds: duration.summary?.recommended_total_video_seconds || null,
    estimated_total_audio_seconds: duration.summary?.estimated_total_audio_seconds || null,
    manifest_total_seconds: duration.summary?.manifest_total_seconds || null,
    status: decision
  };
}

function buildAudioRerenderDecisionReport({
  scripts = [],
  voiceProfileReport = {},
  pacingReport = {},
  emotionReport = {},
  pauseReport = {},
  durationReport = {}
}) {
  const decisions = scripts.map(script => {
    const scriptId = script.script_id || script.scriptId;

    return decideAudioRerender({
      scriptId,
      voice: (voiceProfileReport.profiles || []).find(x => x.script_id === scriptId) || {},
      pacing: (pacingReport.reports || []).find(x => x.script_id === scriptId) || {},
      emotion: (emotionReport.reports || []).find(x => x.script_id === scriptId) || {},
      pause: (pauseReport.reports || []).find(x => x.script_id === scriptId) || {},
      duration: (durationReport.reports || []).find(x => x.script_id === scriptId) || {}
    });
  });

  const rerenderRequired = decisions.filter(x => x.rerender_required).length;
  const reviewRequired = decisions.filter(x => x.review_required).length;
  const approved = decisions.length - reviewRequired;

  const averageReadiness = decisions.length
    ? clampScore(decisions.reduce((sum, x) => sum + x.final_audio_readiness_score, 0) / decisions.length)
    : 0;

  return {
    generated_at: new Date().toISOString(),
    total_scripts: decisions.length,
    summary: {
      approved,
      review_required: reviewRequired,
      rerender_required: rerenderRequired,
      average_audio_readiness_score: averageReadiness,
      status: rerenderRequired > 0
        ? "audio_rerender_or_retime_required"
        : reviewRequired > 0
          ? "audio_review_required"
          : "audio_approved"
    },
    decisions
  };
}

module.exports = {
  scoreDurationAlignment,
  decideAudioRerender,
  buildAudioRerenderDecisionReport
};
