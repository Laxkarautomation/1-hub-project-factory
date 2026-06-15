function normalizeTopic(topic = "") {
  return String(topic || "real incident").trim();
}

function buildTopicHook(topic) {
  const cleanTopic = normalizeTopic(topic);

  if (cleanTopic.includes("loan fraud")) {
    return "Loan ke naam par ek aadmi ko madad ka bharosa diya gaya, lekin asli khel uske documents ke saath hua...";
  }

  if (cleanTopic.includes("family betrayal")) {
    return "Kabhi kabhi sabse bada dhokha bahar wala nahi, ghar ka apna aadmi deta hai...";
  }

  if (cleanTopic.includes("village")) {
    return "Ek chhote se Indian village me kuch aisa hua jiske baare me log aaj bhi dheere awaaz me baat karte hain...";
  }

  if (cleanTopic.includes("money")) {
    return "Paise ki ek galat planning kabhi kabhi poori zindagi ka sabse bada lesson ban jaati hai...";
  }

  if (cleanTopic.includes("crime")) {
    return "Ek chhote shehar ki shaant gali me hua ek incident, jiska sach pehle kisi ko samajh hi nahi aaya...";
  }

  return `${cleanTopic} se judi ek kahani hai, jisme shuruaat simple thi lekin end ne sabko hila diya...`;
}

function buildScenePlan(topic, formula) {
  const cleanTopic = normalizeTopic(topic);

  if ((formula || "").includes("CRIME")) {
    return [
      `${cleanTopic} ka victim aur situation setup`,
      `${cleanTopic} me crime trigger point`,
      `${cleanTopic} investigation clues`,
      `${cleanTopic} suspect angle ya reveal`,
      `${cleanTopic} warning lesson`
    ];
  }

  if ((formula || "").includes("FEAR")) {
    return [
      `${cleanTopic} ka normal location setup`,
      `${cleanTopic} me pehla strange sign`,
      `${cleanTopic} me fear escalation`,
      `${cleanTopic} ka shocking twist`,
      `${cleanTopic} unanswered ending`
    ];
  }

  return [
    `${cleanTopic} ka real-life setup`,
    `${cleanTopic} me trust ya greed ka trigger`,
    `${cleanTopic} ki situation dheere dheere serious hoti hai`,
    `${cleanTopic} ka hidden twist saamne aata hai`,
    `${cleanTopic} se milne wali warning`
  ];
}

function buildScriptBriefs(recommendations = []) {
  return recommendations.map(item => {
    const topic = item.topic;
    const formula = item.suggested_formula;

    return {
      rank: item.rank,
      topic,
      working_title: `${topic}: ek real kahani jo sabko warning deti hai`,
      opening_hook: buildTopicHook(topic),
      target_emotion: "curiosity, fear, shock, lesson",
      story_formula: formula,
      scene_plan: buildScenePlan(topic, formula),
      narration_style: "Hindi/Hinglish, suspenseful, simple, emotional",
      ending_lesson: `${topic} jaisi kahani hume ek baat samjhati hai — trust karo, lekin bina verify kiye kabhi decision mat lo.`,
      estimated_duration_seconds: 60
    };
  });
}

module.exports = {
  buildScriptBriefs
};
