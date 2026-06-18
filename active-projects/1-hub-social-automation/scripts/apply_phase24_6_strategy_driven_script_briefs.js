const fs = require("fs");

const builderPath = "modules/intelligence/core/script_brief_builder.js";
const servicePath = "modules/intelligence/services/build_script_briefs.js";

const builderCode = `function normalizeTopic(topic = "") {
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
    return \`\${cleanTopic} me ek aisi detail chhupi hai jise zyadatar \${targetAudience} ignore kar dete hain...\`;
  }

  if (hookStyles.includes("shock")) {
    return \`\${cleanTopic} ka twist itna unexpected tha ki poori story ka meaning badal gaya...\`;
  }

  if (hookStyles.includes("unanswered_question")) {
    return \`\${cleanTopic} ka sawal simple lagta hai, lekin iska jawab aaj bhi clear nahi hai...\`;
  }

  if (hookStyles.includes("problem_solution")) {
    return \`\${cleanTopic} ki problem ka solution ek chhoti si detail me chhupa hota hai...\`;
  }

  if (hookStyles.includes("trust")) {
    return \`\${cleanTopic} me trust zaroori hai, lekin bina verify kiye decision mehenga pad sakta hai...\`;
  }

  return \`\${cleanTopic} se judi ek kahani hai, jisme shuruaat simple thi lekin end ne sabko sochne par majboor kar diya...\`;
}

function buildScenePlan(topic, formula, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const contentMode = channel.contentMode || "story";
  const pillars = toList(channel.contentPillars);
  const primaryPillar = pickFirst(pillars, "main context");

  if ((formula || "").includes("PROBLEM")) {
    return [
      \`\${cleanTopic} problem setup for audience\`,
      \`\${cleanTopic} common mistake or confusion\`,
      \`\${cleanTopic} important explanation\`,
      \`\${cleanTopic} practical solution angle\`,
      \`\${cleanTopic} clear action or reminder\`
    ];
  }

  if ((formula || "").includes("FACT")) {
    return [
      \`\${cleanTopic} surprising fact setup\`,
      \`\${cleanTopic} background context\`,
      \`\${cleanTopic} key detail or proof point\`,
      \`\${cleanTopic} reveal or misconception break\`,
      \`\${cleanTopic} final takeaway\`
    ];
  }

  if ((formula || "").includes("QUESTION")) {
    return [
      \`\${cleanTopic} unanswered question setup\`,
      \`\${cleanTopic} known clues\`,
      \`\${cleanTopic} conflicting detail\`,
      \`\${cleanTopic} strongest theory or twist\`,
      \`\${cleanTopic} unresolved ending\`
    ];
  }

  return [
    \`\${cleanTopic} opening context based on \${contentMode}\`,
    \`\${cleanTopic} connection with \${primaryPillar}\`,
    \`\${cleanTopic} escalation or key development\`,
    \`\${cleanTopic} twist, reveal, or important insight\`,
    \`\${cleanTopic} audience takeaway\`
  ];
}

function buildNarrationStyle(channel = {}) {
  const language = channel.language || "Hindi/Hinglish";
  const tone = channel.tone || channel.contentStyle?.tone || "simple, engaging";
  const audience = channel.targetAudience || "general audience";

  return \`\${language}, \${tone}, made for \${audience}\`;
}

function buildEndingLesson(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const mode = channel.contentMode || "story";

  if (mode === "education" || mode === "finance") {
    return \`\${cleanTopic} ka simple lesson hai — decision lene se pehle details verify karo aur document clear rakho.\`;
  }

  if (mode === "facts") {
    return \`\${cleanTopic} hume dikhata hai ki har fact ke peeche ek context hota hai — sirf headline nahi, detail samjho.\`;
  }

  return \`\${cleanTopic} jaisi kahani hume ek baat samjhati hai — jo detail chhoti lagti hai, wahi kabhi kabhi poori story badal deti hai.\`;
}

function buildWorkingTitle(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const mode = channel.contentMode || "story";

  if (mode === "facts") {
    return \`\${cleanTopic}: ek fact jo pehle simple lagta hai\`;
  }

  if (mode === "education" || mode === "finance") {
    return \`\${cleanTopic}: simple explanation for better decision\`;
  }

  return \`\${cleanTopic}: ek story jisme hidden warning chhupi thi\`;
}

function buildScriptBriefs(recommendations = [], options = {}) {
  const channel = options.channel || {};
  const strategyFormulas = toList(channel.storyFormulas);

  return recommendations.map(item => {
    const topic = item.topic;
    const formula = strategyFormulas[0] || item.suggested_formula;

    return {
      rank: item.rank,
      topic,
      working_title: buildWorkingTitle(topic, channel),
      opening_hook: buildTopicHook(topic, channel),
      target_emotion: toList(channel.hookStyles).join(", ") || "curiosity, clarity, retention",
      story_formula: formula,
      scene_plan: buildScenePlan(topic, formula, channel),
      narration_style: buildNarrationStyle(channel),
      visual_style: channel.visualStyle || "",
      target_audience: channel.targetAudience || "",
      ending_lesson: buildEndingLesson(topic, channel),
      estimated_duration_seconds: 60
    };
  });
}

module.exports = {
  buildScriptBriefs,
  buildTopicHook,
  buildScenePlan
};
`;

fs.writeFileSync(builderPath, builderCode);

let serviceCode = fs.readFileSync(servicePath, "utf8");

if (!serviceCode.includes("resolveChannelRuntime")) {
  serviceCode = serviceCode.replace(
    `const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");`,
    `const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");`
  );
}

serviceCode = serviceCode.replace(
  `const recommendations = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));

const briefs = buildScriptBriefs(recommendations.recommended_topics || []);`,
  `const recommendations = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));
const runtimeResult = resolveChannelRuntime();
const channel = runtimeResult.success ? runtimeResult.channel : {};

const briefs = buildScriptBriefs(recommendations.recommended_topics || [], { channel });`
);

serviceCode = serviceCode.replace(
  `  source_file: recommendationPath,
  total_briefs: briefs.length,`,
  `  source_file: recommendationPath,
  channelId: channel.channelId || recommendations.channelId || "active_channel",
  channel_strategy: {
    contentMode: channel.contentMode || "",
    contentCategories: channel.contentCategories || [],
    contentPillars: channel.contentPillars || [],
    topicKeywords: channel.topicKeywords || [],
    storyFormulas: channel.storyFormulas || [],
    hookStyles: channel.hookStyles || [],
    visualStyle: channel.visualStyle || "",
    targetAudience: channel.targetAudience || ""
  },
  total_briefs: briefs.length,`
);

fs.writeFileSync(servicePath, serviceCode);

console.log("✅ Phase 24.6 strategy-driven script briefs patch applied");
console.log("Updated:", builderPath);
console.log("Updated:", servicePath);
