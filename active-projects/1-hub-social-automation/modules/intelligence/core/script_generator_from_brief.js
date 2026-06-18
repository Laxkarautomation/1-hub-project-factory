function cleanText(value = "") {
  return String(value || "").trim();
}

function getScene(brief, index, fallback = "") {
  const scenes = Array.isArray(brief.scene_plan) ? brief.scene_plan : [];
  return cleanText(scenes[index]) || fallback;
}

function buildLineFromScene(scene, role, brief) {
  const topic = cleanText(brief.topic);
  const cleanScene = cleanText(scene);

  if (role === "intro") {
    return cleanScene
      ? `${cleanScene}. Yahin se ${topic} ki story shuru hoti hai.`
      : `${topic} ki shuruaat simple lagti hai, lekin context dheere dheere serious hota hai.`;
  }

  if (role === "escalation") {
    return cleanScene
      ? `${cleanScene}. Isi point par story me tension aur curiosity dono badhne lagte hain.`
      : `${topic} me ek ke baad ek details saamne aati hain, aur situation clear hone ke bajay aur confusing banne lagti hai.`;
  }

  if (role === "turn") {
    return cleanScene
      ? `${cleanScene}. Ye detail poori story ka direction badal deti hai.`
      : `Phir ek detail saamne aati hai jo ${topic} ka angle badal deti hai.`;
  }

  if (role === "twist") {
    return cleanScene
      ? `${cleanScene}. Yahin par samajh aata hai ki asli baat shuruaat se hi chhupi hui thi.`
      : `${topic} ka twist tab samne aata hai jab chhupi hui detail connect hone lagti hai.`;
  }

  return cleanScene || `${topic} ka important takeaway audience ke saamne aata hai.`;
}

function buildTimedScript(brief) {
  const topic = cleanText(brief.topic);

  return [
    {
      time: "0-5s",
      text: cleanText(brief.opening_hook) || `${topic} ki ek story hai jiska twist end tak clear nahi hota...`
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
      text: cleanText(brief.ending_lesson) || buildLineFromScene(getScene(brief, 4), "ending", brief)
    }
  ];
}

function generateScriptFromBrief(brief, index) {
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
    script: buildTimedScript(brief),
    image_prompt_seed: {
      mood: brief.visual_style || "channel strategy visual style",
      format: "9:16 vertical",
      style: brief.visual_style || "strategy-driven realistic visuals",
      scenes: brief.scene_plan || [],
      topic: brief.topic,
      visual_direction: brief.visual_style || "topic-specific realistic scenes based on channel strategy"
    },
    status: "script_from_brief_draft"
  };
}

function generateScriptsFromBriefs(briefs = []) {
  return briefs.map((brief, index) => generateScriptFromBrief(brief, index));
}

module.exports = {
  generateScriptFromBrief,
  generateScriptsFromBriefs,
  buildTimedScript
};
