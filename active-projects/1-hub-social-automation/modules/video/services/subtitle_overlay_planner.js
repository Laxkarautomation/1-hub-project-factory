function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function clampScore(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function roundTwo(value = 0) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function wordCount(value = "") {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function normalizeWord(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/^[^\w\u0900-\u097F]+|[^\w\u0900-\u097F]+$/g, "")
    .trim();
}

function unique(values = []) {
  const seen = new Set();
  return values.filter(value => {
    const normalized = normalizeWord(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function findReport(report = {}, scriptId) {
  return toArray(report.reports).find(item => item.script_id === scriptId) || {};
}

function findSceneItem(items = [], sceneNumber) {
  return toArray(items).find(item => Number(item.scene) === Number(sceneNumber)) || {};
}

function sceneHasRetentionRecommendation(retention = {}, sceneNumber, types = []) {
  return toArray(retention.recommendations).some(item => {
    const matchesScene = toArray(item.scenes).some(scene => Number(scene) === Number(sceneNumber));
    const matchesType = types.length === 0 || types.includes(item.recommendation_type);
    return matchesScene && matchesType;
  });
}

function selectSubtitleStyle(segment = "", emotion = {}) {
  const normalizedSegment = String(segment || "").toLowerCase();
  const intensity = Number(emotion.emotion_intensity || 0);
  const primaryEmotion = String(emotion.primary_emotion || "").toLowerCase();

  if (normalizedSegment === "hook") return "bold_hook_caption";
  if (normalizedSegment === "reveal" || primaryEmotion.includes("shock")) return "impact_reveal_caption";
  if (normalizedSegment === "cta") return "clean_cta_caption";
  if (intensity >= 82) return "high_emotion_caption";
  return "clean_documentary_caption";
}

function selectSubtitlePosition(segment = "", wordTotal = 0) {
  const normalizedSegment = String(segment || "").toLowerCase();
  if (normalizedSegment === "hook") return "upper_safe_center";
  if (normalizedSegment === "cta") return "lower_safe_center";
  if (wordTotal > 18) return "mid_lower_safe";
  return "bottom_safe_center";
}

const EMOTION_KEYWORDS = {
  fear_suspense: ["fear", "darr", "darte", "raat", "dark", "shadow", "khaali"],
  mystery_curiosity: ["mystery", "raaz", "hidden", "secret", "truth", "sach", "case"],
  investigation: ["facts", "details", "case", "records", "evidence", "clue"],
  shock_reveal: ["shocking", "alag", "interesting", "unimaginable", "reveal", "twist"],
  danger_tension: ["accident", "crash", "survival", "rescue", "emergency", "broken"],
  cta_curiosity: ["comment", "batao", "lagta", "truth", "sach"]
};

const FALLBACK_KEYWORDS = [
  "hidden",
  "secret",
  "truth",
  "sach",
  "case",
  "mystery",
  "fear",
  "darr",
  "shocking",
  "reveal",
  "twist",
  "comment",
  "batao"
];

function extractHighlightKeywords(narration = "", emotion = {}) {
  const words = String(narration || "").split(/\s+/).map(normalizeWord).filter(Boolean);
  const primary = String(emotion.primary_emotion || "").toLowerCase();
  const candidates = [
    ...toArray(EMOTION_KEYWORDS[primary]),
    ...toArray(emotion.matched_emotions).flatMap(item => EMOTION_KEYWORDS[item.emotion] || []),
    ...FALLBACK_KEYWORDS
  ].map(normalizeWord);
  const candidateSet = new Set(candidates);
  const directMatches = words.filter(word => candidateSet.has(word));
  const longSignalWords = words.filter(word => word.length >= 8 && !["available", "documentary"].includes(word));

  return unique([...directMatches, ...longSignalWords]).slice(0, 4);
}

function extractEmphasisWords(narration = "", emotion = {}, segment = "") {
  const intensity = Number(emotion.emotion_intensity || 0);
  const primary = String(emotion.primary_emotion || "").toLowerCase();
  const keywords = extractHighlightKeywords(narration, emotion);
  const words = String(narration || "").split(/\s+/).map(normalizeWord).filter(Boolean);
  const strongWords = words.filter(word => word.length >= 7);

  if (intensity >= 78 || ["hook", "reveal", "cta"].includes(String(segment || "").toLowerCase())) {
    return unique([...keywords, ...strongWords]).slice(0, primary.includes("neutral") ? 1 : 3);
  }

  return [];
}

function selectOverlayType(segment = "", emotion = {}, hasPatternBreak = false) {
  const normalizedSegment = String(segment || "").toLowerCase();
  const primary = String(emotion.primary_emotion || "").toLowerCase();
  const intensity = Number(emotion.emotion_intensity || 0);

  if (normalizedSegment === "reveal" || primary.includes("shock")) return "reveal_emphasis";
  if (hasPatternBreak) return "pattern_break_caption";
  if (normalizedSegment === "hook") return "hook_keyword_pop";
  if (normalizedSegment === "cta") return "cta_prompt";
  if (intensity >= 82) return "emotion_keyword_pop";
  return "supporting_subtitle";
}

function buildOverlayTiming(scene = {}, pacing = {}, emotion = {}, hasPatternBreak = false) {
  const durationMs = Math.max(1000, Math.round(Number(scene.duration_seconds || 0) * 1000));
  const intensity = Number(emotion.emotion_intensity || 0);
  const words = Number(pacing.word_count || wordCount(scene.narration));
  const timing = hasPatternBreak || intensity >= 85 ? 250 : 400;
  const readableWindow = words > 18 ? 3600 : 2800;
  const overlayDuration = Math.min(Math.max(1400, readableWindow), Math.max(1200, durationMs - timing - 350));

  return {
    overlay_timing_ms: timing,
    overlay_duration_ms: Math.round(overlayDuration)
  };
}

function scoreReadability(scene = {}, pacing = {}, highlightKeywords = []) {
  const duration = Number(scene.duration_seconds || pacing.manifest_duration_seconds || 0);
  const words = Number(pacing.word_count || wordCount(scene.narration));
  const wordsPerSecond = duration > 0 ? words / duration : words;
  const overloadPenalty = Math.max(0, words - 14) * 5;
  const speedPenalty = Math.max(0, wordsPerSecond - 2.4) * 22;
  const keywordPenalty = highlightKeywords.length > 3 ? (highlightKeywords.length - 3) * 4 : 0;

  return clampScore(100 - overloadPenalty - speedPenalty - keywordPenalty);
}

function buildSceneSubtitleOverlay(scene = {}, index = 0, audioPacing = {}, emotionCue = {}, retention = {}) {
  const sceneNumber = scene.scene || index + 1;
  const segment = audioPacing.segment || emotionCue.segment || scene.segment || "";
  const hasPatternBreak = sceneHasRetentionRecommendation(retention, sceneNumber, [
    "insert_pattern_break",
    "add_cut"
  ]);
  const highlightKeywords = extractHighlightKeywords(scene.narration || audioPacing.narration, emotionCue);
  const emphasisWords = extractEmphasisWords(
    scene.narration || audioPacing.narration,
    emotionCue,
    segment
  );
  const timing = buildOverlayTiming(scene, audioPacing, emotionCue, hasPatternBreak);

  return {
    scene: sceneNumber,
    segment,
    subtitle_style: selectSubtitleStyle(segment, emotionCue),
    subtitle_position: selectSubtitlePosition(segment, Number(audioPacing.word_count || wordCount(scene.narration))),
    emphasis_words: emphasisWords,
    highlight_keywords: highlightKeywords,
    overlay_type: selectOverlayType(segment, emotionCue, hasPatternBreak),
    overlay_timing_ms: timing.overlay_timing_ms,
    overlay_duration_ms: timing.overlay_duration_ms,
    readability_score: scoreReadability(scene, audioPacing, highlightKeywords),
    word_count: Number(audioPacing.word_count || wordCount(scene.narration)),
    emotion_intensity: Number(emotionCue.emotion_intensity || 0),
    retention_attention_flag: hasPatternBreak
  };
}

function issue(issueType, severity, scenes, reason) {
  return { issue_type: issueType, severity, scenes, reason };
}

function detectOverlayIssues(scenes = []) {
  const rows = toArray(scenes);
  const issues = [];
  const overloaded = rows.filter(scene => scene.word_count > 18);
  const lowReadability = rows.filter(scene => scene.readability_score < 70);
  const missingEmphasis = rows.filter(scene =>
    (scene.emotion_intensity >= 82 || scene.retention_attention_flag) &&
    toArray(scene.emphasis_words).length === 0
  );
  const poorKeywordHighlighting = rows.filter(scene =>
    (scene.emotion_intensity >= 78 || scene.retention_attention_flag) &&
    toArray(scene.highlight_keywords).length === 0
  );

  if (overloaded.length > 0) {
    issues.push(issue(
      "text_overload",
      overloaded.some(scene => scene.word_count > 22) ? "high" : "medium",
      overloaded.map(scene => scene.scene),
      "scene subtitles contain too many words for a short-form readable overlay"
    ));
  }

  if (lowReadability.length > 0) {
    issues.push(issue(
      "low_readability",
      lowReadability.some(scene => scene.readability_score < 55) ? "high" : "medium",
      lowReadability.map(scene => scene.scene),
      "subtitle density and timing reduce readability"
    ));
  }

  if (missingEmphasis.length > 0) {
    issues.push(issue(
      "missing_emphasis_moments",
      "medium",
      missingEmphasis.map(scene => scene.scene),
      "high-emotion scenes need at least one emphasis word"
    ));
  }

  if (poorKeywordHighlighting.length > 0) {
    issues.push(issue(
      "poor_keyword_highlighting",
      "medium",
      poorKeywordHighlighting.map(scene => scene.scene),
      "attention-critical scenes need highlight keywords"
    ));
  }

  return issues;
}

function buildSubtitleOverlayPlanForVideo(
  video = {},
  audioPacingReport = {},
  emotionCueReport = {},
  retentionReport = {}
) {
  const scriptId = video.script_id || video.scriptId;
  const audio = findReport(audioPacingReport, scriptId);
  const emotion = findReport(emotionCueReport, scriptId);
  const retention = findReport(retentionReport, scriptId);
  const scenes = toArray(video.scenes).map((scene, index) => {
    const sceneNumber = scene.scene || index + 1;
    return buildSceneSubtitleOverlay(
      scene,
      index,
      findSceneItem(audio.pacing, sceneNumber),
      findSceneItem(emotion.cues, sceneNumber),
      retention
    );
  });

  return {
    script_id: scriptId,
    title: video.title || null,
    total_scenes: scenes.length,
    average_readability_score: clampScore(
      scenes.reduce((sum, scene) => sum + scene.readability_score, 0) / Math.max(1, scenes.length)
    ),
    detected_issues: detectOverlayIssues(scenes),
    status: "subtitle_overlay_plan_ready",
    scenes
  };
}

function buildSubtitleOverlayPlanBatch(
  manifest = [],
  audioPacingReport = {},
  emotionCueReport = {},
  retentionReport = {},
  manifestSource = "modules/video/output/optimized_video_manifest.json"
) {
  const plans = toArray(manifest).map(video =>
    buildSubtitleOverlayPlanForVideo(video, audioPacingReport, emotionCueReport, retentionReport)
  );
  const allScenes = plans.flatMap(plan => plan.scenes);
  const totalWords = allScenes.reduce((sum, scene) => sum + scene.word_count, 0);
  const totalSeconds = toArray(manifest).flatMap(video => toArray(video.scenes))
    .reduce((sum, scene) => sum + Number(scene.duration_seconds || 0), 0);

  return {
    generated_at: new Date().toISOString(),
    manifest_source: manifestSource,
    total_scripts: plans.length,
    summary: {
      average_readability_score: clampScore(
        allScenes.reduce((sum, scene) => sum + scene.readability_score, 0) / Math.max(1, allScenes.length)
      ),
      total_highlight_keywords: allScenes.reduce(
        (sum, scene) => sum + toArray(scene.highlight_keywords).length,
        0
      ),
      subtitle_density: roundTwo(totalSeconds > 0 ? totalWords / totalSeconds : 0),
      status: plans.length > 0
        ? "subtitle_overlay_plan_batch_ready"
        : "subtitle_overlay_plan_batch_empty"
    },
    plans
  };
}

module.exports = {
  buildSceneSubtitleOverlay,
  buildSubtitleOverlayPlanBatch,
  buildSubtitleOverlayPlanForVideo,
  detectOverlayIssues,
  extractEmphasisWords,
  extractHighlightKeywords,
  scoreReadability,
  selectOverlayType,
  selectSubtitlePosition,
  selectSubtitleStyle
};
