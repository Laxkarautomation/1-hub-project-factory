function buildScenePlan(topic, formula) {
  const base = [
    "Opening hook with curiosity",
    "Normal world setup",
    "Incident or conflict begins",
    "Twist / discovery / danger point",
    "Final reveal and lesson"
  ];

  if ((formula || "").includes("CRIME")) {
    return [
      "Victim or situation setup",
      "Crime trigger",
      "Investigation clues",
      "Reveal or suspect angle",
      "Lesson / warning"
    ];
  }

  if ((formula || "").includes("FEAR")) {
    return [
      "Normal location setup",
      "First strange sign",
      "Fear escalates",
      "Paranormal or shocking twist",
      "Unanswered ending"
    ];
  }

  return base;
}

function buildScriptBriefs(recommendations = []) {
  return recommendations.map(item => {
    const topic = item.topic;
    const formula = item.suggested_formula;

    return {
      rank: item.rank,
      topic,
      working_title: `${topic}: ek real kahani jo sabko warning deti hai`,
      opening_hook: "Ek normal din, ek galat decision, aur phir sab kuch badal gaya...",
      target_emotion: "curiosity, fear, shock, lesson",
      story_formula: formula,
      scene_plan: buildScenePlan(topic, formula),
      narration_style: "Hindi/Hinglish, suspenseful, simple, emotional",
      ending_lesson: "Har real incident ke peeche ek warning hoti hai — ignore mat karo.",
      estimated_duration_seconds: 60
    };
  });
}

module.exports = {
  buildScriptBriefs
};
