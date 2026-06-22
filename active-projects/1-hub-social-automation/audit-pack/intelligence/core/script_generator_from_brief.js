function cleanText(value = "") {
  return String(value || "").trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function cleanTopicLabel(value = "") {
  return cleanText(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTemplateLanguage(scene = "", topic = "") {
  let text = cleanTopicLabel(scene);
  const cleanTopic = cleanTopicLabel(topic);

  if (cleanTopic && text.toLowerCase().startsWith(cleanTopic.toLowerCase())) {
    text = text.slice(cleanTopic.length).trim();
  }

  return text
    .replace(/opening context based on story/gi, "shuruaat me sab kuch normal lagta hai")
    .replace(/connection with/gi, "iska connection")
    .replace(/escalation or key development/gi, "phir ek important development saamne aata hai")
    .replace(/twist, reveal, or important insight/gi, "lekin asli twist tab saamne aata hai")
    .replace(/audience takeaway/gi, "is kahani ka sabse bada lesson")
    .replace(/main context/gi, "main story")
    .replace(/\s+/g, " ")
    .trim();
}

const TEMPLATE_LINE_PATTERNS = [
  /context ke hisa{1,2}b se/i,
  /initial incident or report/i,
  /evidence or statement contradiction/i,
  /ignored clue becomes important/i,
  /timeline important angle/i
];

function hasTemplateLanguage(value = "") {
  const text = cleanText(value);
  return TEMPLATE_LINE_PATTERNS.some(pattern => pattern.test(text));
}

function sanitizeFinalNarration(value = "") {
  const text = cleanText(value)
    .replace(/^(Context ke hisa{1,2}b se|Available details ke hisa{1,2}b se|Jo details available hain unke hisa{1,2}b se),?\s*/i, "")
    .replace(/ignored risk signal/gi, "chhota warning signal")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || hasTemplateLanguage(text)) return "";
  return sentence(text);
}

function pickFinalNarration(candidates = []) {
  for (const candidate of candidates) {
    const text = sanitizeFinalNarration(candidate);
    if (text) return text;
  }

  return "";
}

function sentence(value = "") {
  const text = cleanText(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function removeRepeatedTopic(text = "", topic = "") {
  const cleanTopic = cleanTopicLabel(topic);
  if (!cleanTopic) return cleanText(text);

  const escaped = cleanTopic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  let seen = false;

  return cleanText(text).replace(re, (match) => {
    if (!seen) {
      seen = true;
      return match;
    }
    return "ye case";
  });
}

function getScene(brief, index, fallback = "") {
  const scenes = Array.isArray(brief.scene_plan) ? brief.scene_plan : [];
  return cleanText(scenes[index]) || fallback;
}

function getStoryBlock(brief, role) {
  const blocks = brief.story_blocks || {};
  const map = {
    intro: blocks.setup,
    escalation: blocks.conflict,
    turn: blocks.clue,
    twist: blocks.twist,
    ending: blocks.lesson
  };

  return cleanText(map[role] || "");
}

function getSkeletonLine(brief, role) {
  const skeleton = brief.story_skeleton || {};

  const map = {
    intro: skeleton.setting,
    escalation: skeleton.conflict,
    turn: skeleton.clue,
    twist: skeleton.twist,
    ending: skeleton.takeaway
  };

  return cleanText(map[role] || "");
}

function buildLineFromScene(scene, role, brief) {
  const topic = cleanTopicLabel(brief.topic);
  const storyBlock = getStoryBlock(brief, role);

  if (storyBlock) {
    return removeRepeatedTopic(sentence(storyBlock), topic);
  }

  const skeletonLine = getSkeletonLine(brief, role);
  const cleanScene = skeletonLine || stripTemplateLanguage(scene, topic);

  if (role === "intro") {
    return cleanScene
      ? `${sentence(cleanScene)} Yahin se ${topic} ki kahani dheere dheere serious hone lagti hai.`
      : `${topic} ki shuruaat simple lagti hai, lekin context dheere dheere serious hota hai.`;
  }

  if (role === "escalation") {
    return cleanScene
      ? `${sentence(cleanScene)} Isi point par tension aur curiosity dono badhne lagte hain.`
      : `${topic} me ek ke baad ek details saamne aati hain, aur situation clear hone ke bajay aur confusing banne lagti hai.`;
  }

  if (role === "turn") {
    return cleanScene
      ? `${sentence(cleanScene)} Ye detail poori kahani ka direction badal deti hai.`
      : `Phir ek detail saamne aati hai jo ${topic} ka angle badal deti hai.`;
  }

  if (role === "twist") {
    return cleanScene
      ? `${sentence(cleanScene)} Yahin par samajh aata hai ki asli baat shuruaat se hi chhupi hui thi.`
      : `${topic} ka twist tab saamne aata hai jab chhupi hui detail connect hone lagti hai.`;
  }

  return cleanScene
    ? sentence(cleanScene)
    : `${topic} ka important takeaway audience ke saamne aata hai.`;
}

function buildTimedScript(brief) {
  const topic = cleanText(brief.topic);

  return [
    {
      time: "0-5s",
      text: cleanText(brief.story_blocks?.hook) || cleanText(brief.opening_hook) || `${topic} ki ek story hai jiska twist end tak clear nahi hota...`
    },
    {
      time: "5-12s",
      text: buildLineFromScene(getScene(brief, 0), "intro", brief)
    },
    {
      time: "12-22s",
      text: buildLineFromScene(getScene(brief, 1), "escalation", brief)
    },
    {
      time: "22-35s",
      text: buildLineFromScene(getScene(brief, 2), "turn", brief)
    },
    {
      time: "35-50s",
      text: buildLineFromScene(getScene(brief, 3), "twist", brief)
    },
    {
      time: "50-60s",
      text: cleanText(brief.story_blocks?.lesson) || cleanText(brief.ending_lesson) || buildLineFromScene(getScene(brief, 4), "ending", brief)
    }
  ];
}

function getDocumentaryScript(brief = {}) {
  return brief.documentary_script || {};
}

function getFinalSceneBeats(brief = {}) {
  const documentaryScript = getDocumentaryScript(brief);
  const documentaryBeats = toArray(documentaryScript.scene_beats);
  if (documentaryBeats.length) return documentaryBeats;

  return toArray(brief.scene_beats);
}

function getFinalNarrationScript(brief = {}) {
  const documentaryScript = getDocumentaryScript(brief);
  return cleanText(brief.narration_script || documentaryScript.narration_script || "");
}

function splitNarrationScript(narrationScript = "") {
  const text = cleanText(narrationScript);
  if (!text) return [];

  const matches = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
  return matches.map(item => cleanText(item)).filter(Boolean);
}

function getStoryArcLine(brief = {}, beat = "") {
  const arc = getDocumentaryScript(brief).story_arc || {};
  const normalizedBeat = cleanText(beat).toLowerCase();
  const arcMap = {
    hook: arc.hook,
    setup: arc.context,
    context: arc.context,
    conflict: arc.complication,
    complication: arc.complication,
    evidence: arc.evidence,
    escalation: arc.escalation,
    turn: arc.reveal,
    reveal: arc.reveal,
    takeaway: arc.lesson,
    lesson: arc.lesson
  };

  return cleanText(arcMap[normalizedBeat] || "");
}

function getFinalDurationSeconds(brief = {}) {
  const documentaryScript = getDocumentaryScript(brief);
  return Number(
    brief.script_quality_score?.estimated_duration_seconds ||
    documentaryScript.quality_score?.estimated_duration_seconds ||
    brief.estimated_duration_seconds ||
    60
  );
}

function formatSecondRange(secondRange = "", index = 0, total = 1, durationSeconds = 60) {
  const cleanRange = cleanText(secondRange);

  if (cleanRange) {
    return /s\b/i.test(cleanRange) ? cleanRange : `${cleanRange}s`;
  }

  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 60;
  const count = Math.max(1, total);
  const start = Math.round((index * duration) / count);
  const end = Math.round(((index + 1) * duration) / count);

  return `${start}-${end}s`;
}

function buildFinalScriptLine(brief = {}, beat = {}, index = 0, narrationLines = []) {
  return pickFinalNarration([
    beat.narration,
    narrationLines[index],
    getStoryArcLine(brief, beat.beat),
    beat.text,
    beat.line
  ]);
}

function buildFinalTimedScript(brief = {}) {
  const beats = getFinalSceneBeats(brief);
  const narrationLines = splitNarrationScript(getFinalNarrationScript(brief));
  const durationSeconds = getFinalDurationSeconds(brief);

  return beats
    .map((beat, index) => {
      const text = buildFinalScriptLine(brief, beat, index, narrationLines);
      if (!text) return null;

      return {
        time: formatSecondRange(beat.second_range || beat.time, index, beats.length, durationSeconds),
        text
      };
    })
    .filter(Boolean);
}

function hasFinalBriefScript(brief = {}) {
  return getFinalSceneBeats(brief).length > 0;
}

function buildImagePromptSeedScenes(brief = {}, finalScript = [], useFinalBrief = false) {
  if (!useFinalBrief) return brief.scene_plan || [];

  const beats = getFinalSceneBeats(brief);
  const scenes = beats
    .map((beat, index) =>
      cleanText(beat.visual_intent) ||
      cleanText(finalScript[index]?.text) ||
      cleanText(beat.narration)
    )
    .filter(Boolean)
    .filter(scene => !hasTemplateLanguage(scene));

  return scenes.length ? scenes : finalScript.map(line => line.text);
}

function generateScriptFromBrief(brief, index) {
  const useFinalBrief = hasFinalBriefScript(brief);
  const finalScript = useFinalBrief ? buildFinalTimedScript(brief) : [];
  const script = finalScript.length ? finalScript : buildTimedScript(brief);

  return {
    script_id: `intelligence_script_${String(index + 1).padStart(3, "0")}`,
    source: "intelligence_script_brief",
    topic: brief.topic,
    working_title: brief.working_title,
    target_emotion: brief.target_emotion,
    story_formula: brief.story_formula,
    duration_seconds: brief.estimated_duration_seconds || 60,
    voice_style: brief.voice_style || "deep suspense narrator",
    narration_style: brief.narration_style,
    visual_style: brief.visual_style || "",
    target_audience: brief.target_audience || "",
    script,
    image_prompt_seed: {
      mood: brief.visual_style || "channel strategy visual style",
      format: "9:16 vertical",
      style: brief.visual_style || "strategy-driven realistic visuals",
      scenes: buildImagePromptSeedScenes(brief, script, useFinalBrief),
      topic: brief.topic,
      visual_direction: brief.visual_style || "topic-specific realistic scenes based on channel strategy"
    },
    status: useFinalBrief && finalScript.length ? "script_from_final_brief" : "script_from_brief_draft"
  };
}

function generateScriptsFromBriefs(briefs = []) {
  return briefs.map((brief, index) => generateScriptFromBrief(brief, index));
}

module.exports = {
  generateScriptFromBrief,
  generateScriptsFromBriefs,
  buildTimedScript,
  buildFinalTimedScript
};
