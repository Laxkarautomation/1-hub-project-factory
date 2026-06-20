const { buildStoryContext } = require("./story_context_builder");
const { realizeStory } = require("./story_realizer");
const { buildResearchNarrative } = require("./research_narrative_engine");
const { buildThirtySecondScript } = require("./script_generation_v2");
const { buildDocumentaryScriptV3 } = require("./script_generation_v3");

function normalizeTopic(topic = "") {
  return String(topic || "real incident").trim();
}

function toList(value = []) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

function pickFirst(items = [], fallback = "") {
  return items.find(Boolean) || fallback;
}

function buildTopicHook(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const hookStyles = toList(channel.hookStyles);
  const targetAudience = channel.targetAudience || "viewers";

  if (hookStyles.includes("curiosity")) {
    return `${cleanTopic} me ek aisi detail chhupi hai jise zyadatar ${targetAudience} ignore kar dete hain...`;
  }

  if (hookStyles.includes("shock")) {
    return `${cleanTopic} ka twist itna unexpected tha ki poori story ka meaning badal gaya...`;
  }

  if (hookStyles.includes("unanswered_question")) {
    return `${cleanTopic} ka sawal simple lagta hai, lekin iska jawab aaj bhi clear nahi hai...`;
  }

  if (hookStyles.includes("problem_solution")) {
    return `${cleanTopic} ki problem ka solution ek chhoti si detail me chhupa hota hai...`;
  }

  if (hookStyles.includes("trust")) {
    return `${cleanTopic} me trust zaroori hai, lekin bina verify kiye decision mehenga pad sakta hai...`;
  }

  return `${cleanTopic} se judi ek kahani hai, jisme shuruaat simple thi lekin end ne sabko sochne par majboor kar diya...`;
}

function buildScenePlan(topic, formula, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const contentMode = channel.contentMode || "story";
  const pillars = toList(channel.contentPillars);
  const primaryPillar = pickFirst(pillars, "main context");

  if ((formula || "").includes("PROBLEM")) {
    return [
      `${cleanTopic} problem setup for audience`,
      `${cleanTopic} common mistake or confusion`,
      `${cleanTopic} important explanation`,
      `${cleanTopic} practical solution angle`,
      `${cleanTopic} clear action or reminder`
    ];
  }

  if ((formula || "").includes("FACT")) {
    return [
      `${cleanTopic} surprising fact setup`,
      `${cleanTopic} background context`,
      `${cleanTopic} key detail or proof point`,
      `${cleanTopic} reveal or misconception break`,
      `${cleanTopic} final takeaway`
    ];
  }

  if ((formula || "").includes("QUESTION")) {
    return [
      `${cleanTopic} unanswered question setup`,
      `${cleanTopic} known clues`,
      `${cleanTopic} conflicting detail`,
      `${cleanTopic} strongest theory or twist`,
      `${cleanTopic} unresolved ending`
    ];
  }

  return [
    `${cleanTopic} opening context based on ${contentMode}`,
    `${cleanTopic} connection with ${primaryPillar}`,
    `${cleanTopic} escalation or key development`,
    `${cleanTopic} twist, reveal, or important insight`,
    `${cleanTopic} audience takeaway`
  ];
}

function buildNarrationStyle(channel = {}) {
  const language = channel.language || "Hindi/Hinglish";
  const tone = channel.tone || channel.contentStyle?.tone || "simple, engaging";
  const audience = channel.targetAudience || "general audience";

  return `${language}, ${tone}, made for ${audience}`;
}

function buildEndingLesson(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const mode = channel.contentMode || "story";

  if (mode === "education" || mode === "finance") {
    return `${cleanTopic} ka simple lesson hai — decision lene se pehle details verify karo aur document clear rakho.`;
  }

  if (mode === "facts") {
    return `${cleanTopic} hume dikhata hai ki har fact ke peeche ek context hota hai — sirf headline nahi, detail samjho.`;
  }

  return `${cleanTopic} jaisi kahani hume ek baat samjhati hai — jo detail chhoti lagti hai, wahi kabhi kabhi poori story badal deti hai.`;
}

function buildWorkingTitle(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const mode = channel.contentMode || "story";

  if (mode === "facts") {
    return `${cleanTopic}: ek fact jo pehle simple lagta hai`;
  }

  if (mode === "education" || mode === "finance") {
    return `${cleanTopic}: simple explanation for better decision`;
  }

  return `${cleanTopic}: ek story jisme hidden warning chhupi thi`;
}

function buildStorySkeleton(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);
  const mode = channel.contentMode || "story";

  const setting = keywords[0] || cleanTopic;
  const conflict = pillars[0] || "hidden problem";
  const clue = keywords[1] || "small detail";
  const twist = pillars[1] || "unexpected reveal";

  return {
    setting: `${cleanTopic} ki shuruaat ${setting} se judi ek normal situation se hoti hai`,
    conflict: `${conflict} saamne aate hi situation serious hone lagti hai`,
    clue: `${clue} se judi ek chhoti detail poori direction badal deti hai`,
    twist: `Aakhir me ${twist} se connection nikalta hai aur story ka asli angle saamne aata hai`,
    takeaway: `Is ${mode} ka sabse bada lesson audience ko yaad rehna chahiye`
  };
}


function buildResearchLookup(researchContexts = []) {
  const lookup = {};

  (researchContexts || []).forEach(item => {
    const topic = String(item.topic || "").trim().toLowerCase();

    if (!topic) return;

    lookup[topic] = item.research_context || {};
  });

  return lookup;
}

function buildScriptBriefs(recommendations = [], options = {}) {
  const channel = options.channel || {};
  const researchLookup = buildResearchLookup(
    options.researchContexts || []
  );
  const strategyFormulas = toList(channel.storyFormulas);

  return recommendations.map(item => {

    const researchContext =
      researchLookup[
        String(item.topic || "").trim().toLowerCase()
      ] || {};
    const topic = item.topic;
    const formula = strategyFormulas[0] || item.suggested_formula;
    const storyContext = buildStoryContext(topic, channel, researchContext);
    const researchNarrative = buildResearchNarrative(topic, channel, researchContext);
    const storyContextWithNarrative = {
      ...storyContext,
      research_narrative: researchNarrative
    };
    const storyBlocks = realizeStory(storyContextWithNarrative);
    const documentaryScript = buildThirtySecondScript(topic, {
      researchContext,
      researchNarrative,
      storyBlocks
    });
    const finalDocumentaryScript = buildDocumentaryScriptV3(topic, {
      researchContext,
      researchNarrative,
      storyBlocks,
      channel
    });

    return {
      script_id: item.script_id || item.scriptId || item.id || `intelligence_script_${String((item.rank || 1)).padStart(3, "0")}`,
      rank: item.rank,
      topic,
      working_title: buildWorkingTitle(topic, channel),
      opening_hook: buildTopicHook(topic, channel),
      target_emotion: toList(channel.hookStyles).join(", ") || "curiosity, clarity, retention",
      story_formula: formula,
      research_context: researchContext,
      research_narrative: researchNarrative,
      story_context: storyContextWithNarrative,
      story_blocks: storyBlocks,
      documentary_script_v2: documentaryScript,
      documentary_script: finalDocumentaryScript,
      narration_script: finalDocumentaryScript.narration_script,
      scene_beats: finalDocumentaryScript.scene_beats,
      script_quality_score: finalDocumentaryScript.quality_score,
      story_skeleton: buildStorySkeleton(topic, channel),
      scene_plan: researchNarrative.scene_plan && researchNarrative.scene_plan.length
        ? researchNarrative.scene_plan
        : Object.values(buildStorySkeleton(topic, channel)),
      narration_style: buildNarrationStyle(channel),
      visual_style: channel.visualStyle || "",
      target_audience: channel.targetAudience || "",
      ending_lesson: buildEndingLesson(topic, channel),
      estimated_duration_seconds: finalDocumentaryScript.quality_score.estimated_duration_seconds || 30
    };
  });
}

module.exports = {
  buildScriptBriefs,
  buildTopicHook,
  buildScenePlan,
  buildStorySkeleton
};
