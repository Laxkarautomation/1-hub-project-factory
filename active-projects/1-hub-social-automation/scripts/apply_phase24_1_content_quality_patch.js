const fs = require("fs");

const briefPath = "modules/intelligence/core/script_brief_builder.js";
const generatorPath = "modules/intelligence/core/script_generator_from_brief.js";

const briefCode = `function normalizeTopic(topic = "") {
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

  return \`\${cleanTopic} se judi ek kahani hai, jisme shuruaat simple thi lekin end ne sabko hila diya...\`;
}

function buildScenePlan(topic, formula) {
  const cleanTopic = normalizeTopic(topic);

  if ((formula || "").includes("CRIME")) {
    return [
      \`\${cleanTopic} ka victim aur situation setup\`,
      \`\${cleanTopic} me crime trigger point\`,
      \`\${cleanTopic} investigation clues\`,
      \`\${cleanTopic} suspect angle ya reveal\`,
      \`\${cleanTopic} warning lesson\`
    ];
  }

  if ((formula || "").includes("FEAR")) {
    return [
      \`\${cleanTopic} ka normal location setup\`,
      \`\${cleanTopic} me pehla strange sign\`,
      \`\${cleanTopic} me fear escalation\`,
      \`\${cleanTopic} ka shocking twist\`,
      \`\${cleanTopic} unanswered ending\`
    ];
  }

  return [
    \`\${cleanTopic} ka real-life setup\`,
    \`\${cleanTopic} me trust ya greed ka trigger\`,
    \`\${cleanTopic} ki situation dheere dheere serious hoti hai\`,
    \`\${cleanTopic} ka hidden twist saamne aata hai\`,
    \`\${cleanTopic} se milne wali warning\`
  ];
}

function buildScriptBriefs(recommendations = []) {
  return recommendations.map(item => {
    const topic = item.topic;
    const formula = item.suggested_formula;

    return {
      rank: item.rank,
      topic,
      working_title: \`\${topic}: ek real kahani jo sabko warning deti hai\`,
      opening_hook: buildTopicHook(topic),
      target_emotion: "curiosity, fear, shock, lesson",
      story_formula: formula,
      scene_plan: buildScenePlan(topic, formula),
      narration_style: "Hindi/Hinglish, suspenseful, simple, emotional",
      ending_lesson: \`\${topic} jaisi kahani hume ek baat samjhati hai — trust karo, lekin bina verify kiye kabhi decision mat lo.\`,
      estimated_duration_seconds: 60
    };
  });
}

module.exports = {
  buildScriptBriefs
};
`;

const generatorCode = `function cleanText(value = "") {
  return String(value || "").trim();
}

function topicIntro(topic) {
  const cleanTopic = cleanText(topic);

  if (cleanTopic.includes("loan fraud")) {
    return "Ek aadmi ko laga loan process simple hai, bas documents dene hain aur approval ka wait karna hai.";
  }

  if (cleanTopic.includes("family betrayal")) {
    return "Ghar ke andar sab kuch normal lag raha tha, lekin rishton ke peeche ek alag hi planning chal rahi thi.";
  }

  if (cleanTopic.includes("village")) {
    return "Gaon ke log apni daily life me busy the, lekin ek chhoti si baat ne poore village ka mahaul badal diya.";
  }

  if (cleanTopic.includes("money")) {
    return "Paise ke decision me usne ek chhoti si warning ignore ki, aur wahi baat baad me sabse mehengi pad gayi.";
  }

  if (cleanTopic.includes("crime")) {
    return "Chhote shehar ki ek normal jagah par hua incident pehle routine case jaisa laga.";
  }

  return \`\${cleanTopic} ki shuruaat simple thi, lekin kahani dheere dheere serious hoti gayi.\`;
}

function buildEscalation(topic) {
  const cleanTopic = cleanText(topic);

  if (cleanTopic.includes("loan fraud")) {
    return "Pehle approval ka promise mila, phir processing ke naam par naye papers maange gaye, aur dheere dheere uske naam ka misuse shuru ho gaya.";
  }

  if (cleanTopic.includes("family betrayal")) {
    return "Pehle chhoti chhoti baatein chhupayi gayi, phir documents aur property ke decisions bina bataye hone lage.";
  }

  if (cleanTopic.includes("village")) {
    return "Ek rumour se shuru hui baat me naye clues judte gaye, aur har clue pehle wale se zyada ajeeb nikla.";
  }

  if (cleanTopic.includes("money")) {
    return "Shuruaat me loss chhota laga, lekin jab calculation samne aayi to pata chala damage kaafi bada ho chuka tha.";
  }

  if (cleanTopic.includes("crime")) {
    return "Police ko pehle kuch clear nahi mila, lekin local logon ki baaton me ek pattern dikhne laga.";
  }

  return "Pehle sab normal laga, phir ek ke baad ek aise clues mile jisse story ka direction badalne laga.";
}

function buildTwist(topic) {
  const cleanTopic = cleanText(topic);

  if (cleanTopic.includes("loan fraud")) {
    return "Asli twist tab aaya jab pata chala ki problem loan reject hone ki nahi thi, balki documents kisi aur kaam me use ho chuke the.";
  }

  if (cleanTopic.includes("family betrayal")) {
    return "Twist ye tha ki jisse sab apna samajh rahe the, wahi aadmi sabse zyada fayda uthane ki planning kar raha tha.";
  }

  if (cleanTopic.includes("village")) {
    return "Sabse shocking baat ye thi ki gaon wale jise accident samajh rahe the, uske peeche kuch aur hi connection nikal raha tha.";
  }

  if (cleanTopic.includes("money")) {
    return "Twist tab samne aaya jab usne realise kiya ki loss market ya kismat se nahi, apni hi jaldbazi se hua tha.";
  }

  if (cleanTopic.includes("crime")) {
    return "Case ka twist tab aaya jab saboot us jagah se mila jahan kisi ne search karne ke baare me socha bhi nahi tha.";
  }

  return "Asli twist tab samne aaya jab pata chala ki jo danger end me dikh raha tha, woh shuruaat se hi kahani me chhupa hua tha.";
}

function buildTimedScript(brief) {
  const topic = cleanText(brief.topic);

  return [
    {
      time: "0-5s",
      text: cleanText(brief.opening_hook) || \`\${topic} ki ek real kahani hai, jiska twist end tak samajh nahi aata...\`
    },
    {
      time: "5-12s",
      text: topicIntro(topic)
    },
    {
      time: "12-22s",
      text: buildEscalation(topic)
    },
    {
      time: "22-35s",
      text: "Phir ek detail saamne aayi jisne poori kahani ka angle badal diya."
    },
    {
      time: "35-50s",
      text: buildTwist(topic)
    },
    {
      time: "50-60s",
      text: cleanText(brief.ending_lesson) || "Isliye har real incident ke peeche ek warning hoti hai."
    }
  ];
}

function generateScriptFromBrief(brief, index) {
  return {
    script_id: \`intelligence_script_\${String(index + 1).padStart(3, "0")}\`,
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
      scenes: brief.scene_plan || [],
      topic: brief.topic,
      visual_direction: "topic-specific realistic scenes, no generic fog unless story needs it"
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
`;

fs.writeFileSync(briefPath, briefCode);
fs.writeFileSync(generatorPath, generatorCode);

console.log("✅ Phase 24.1 content quality patch applied");
console.log("Updated:", briefPath);
console.log("Updated:", generatorPath);
