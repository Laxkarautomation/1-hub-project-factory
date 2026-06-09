function buildTimedScript(brief) {
  const scenes = brief.scene_plan || [];

  return [
    {
      time: "0-5s",
      text: brief.opening_hook || "Ek normal din, aur phir sab kuch badal gaya..."
    },
    {
      time: "5-12s",
      text: `${brief.topic} ek aisi kahani hai jahan shuruaat bilkul normal lagti hai.`
    },
    {
      time: "12-22s",
      text: `${scenes[1] || "Normal world setup"} ke baad dheere dheere situation serious hone lagti hai.`
    },
    {
      time: "22-35s",
      text: `${scenes[2] || "Conflict begins"} yahan story ka sabse important turning point ban jaata hai.`
    },
    {
      time: "35-50s",
      text: `${scenes[3] || "Twist point"} ke baad samajh aata hai ki asli danger pehle se chhupa hua tha.`
    },
    {
      time: "50-60s",
      text: brief.ending_lesson || "Isliye har real incident ke peeche ek warning hoti hai."
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
    voice_style: "deep suspense narrator",
    narration_style: brief.narration_style,
    script: buildTimedScript(brief),
    image_prompt_seed: {
      mood: "dark cinematic realistic suspense",
      format: "9:16 vertical",
      style: "realistic documentary mystery",
      scenes: brief.scene_plan || []
    },
    status: "script_from_brief_draft"
  };
}

function generateScriptsFromBriefs(briefs = []) {
  return briefs.map((brief, index) => generateScriptFromBrief(brief, index));
}

module.exports = {
  generateScriptFromBrief,
  generateScriptsFromBriefs
};
