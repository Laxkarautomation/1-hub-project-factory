const fs = require("fs");

const builderPath = "modules/intelligence/core/recommendation_builder.js";
const servicePath = "modules/intelligence/services/build_unraaz_recommendations.js";

const builderCode = `function pickTop(items = [], count = 5) {
  return items.slice(0, count);
}

function cleanText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function unique(items = []) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getChannelProfile(channel = {}) {
  const niche = cleanText(channel.niche);
  const tone = cleanText(channel.contentStyle?.tone);
  const name = cleanText(channel.name || channel.brand || channel.channelId);

  const combined = [niche, tone, name].join(" ");

  if (
    combined.includes("loan") ||
    combined.includes("finance") ||
    combined.includes("cibil") ||
    combined.includes("msme")
  ) {
    return {
      type: "loan_finance",
      topicPool: [
        "home loan eligibility confusion",
        "low cibil loan problem",
        "business loan document mistake",
        "msme loan approval delay",
        "personal loan rejection reason",
        "property loan hidden charge",
        "loan agent fraud warning",
        "income proof problem story"
      ],
      hookBase: [
        "Loan reject hone ke peeche kabhi kabhi reason CIBIL nahi, ek chhoti document mistake hoti hai...",
        "Bank ka loan process simple lagta hai, lekin ek missing paper poori file rok sakta hai...",
        "Loan ke naam par galat advice lene se customer ka time, paisa aur CIBIL tino kharab ho sakte hain..."
      ]
    };
  }

  if (
    combined.includes("mystery") ||
    combined.includes("incident") ||
    combined.includes("crime") ||
    combined.includes("horror") ||
    combined.includes("unraaz")
  ) {
    return {
      type: "mystery_story",
      topicPool: [
        "indian village mystery",
        "small town unsolved incident",
        "family betrayal case",
        "missing person real story",
        "old newspaper mystery",
        "crime investigation twist",
        "money greed real incident",
        "night road unexplained event"
      ],
      hookBase: [
        "Ye kahani sach hai, lekin iska twist kisi film se kam nahi...",
        "Saboot mile, log mile, lekin sach aaj bhi poora clear nahi hua...",
        "Ek chhoti si detail ne poori kahani ka direction badal diya..."
      ]
    };
  }

  return {
    type: "generic_story",
    topicPool: [
      "real life warning story",
      "small mistake big lesson",
      "trust betrayal incident",
      "hidden truth story",
      "unexpected twist story"
    ],
    hookBase: [
      "Ek simple si kahani, jiska end aapko sochne par majboor kar dega...",
      "Kabhi kabhi sabse chhoti mistake sabse bada lesson ban jaati hai..."
    ]
  };
}

function scoreTopic(topic, patterns = [], gaps = []) {
  const text = cleanText(topic);
  const patternNames = patterns.map(item => cleanText(item.pattern));
  const gapTopics = gaps.map(item => cleanText(item.topic));

  let score = 0;

  for (const pattern of patternNames) {
    if (text.includes(pattern.replace("_", " "))) score += 2;
    if (pattern === "true_crime" && (text.includes("crime") || text.includes("investigation"))) score += 3;
    if (pattern === "real_story" && (text.includes("real") || text.includes("incident") || text.includes("case"))) score += 3;
    if (pattern === "horror" && (text.includes("night") || text.includes("unexplained"))) score += 2;
    if (pattern === "india" && (text.includes("indian") || text.includes("village") || text.includes("small town"))) score += 2;
  }

  for (const gap of gapTopics) {
    if (gap && text.includes(gap)) score += 4;
    const gapWords = gap.split(/\\s+/).filter(word => word.length > 3);
    for (const word of gapWords) {
      if (text.includes(word)) score += 1;
    }
  }

  return score;
}

function buildRecommendedTopics({ patterns = [], gaps = [], formulas = [], channel = {} }) {
  const profile = getChannelProfile(channel);
  const topPatterns = pickTop(patterns, 3).map(item => item.pattern);
  const topFormula = formulas[0]?.formula || "REAL INCIDENT → BUILDUP → TWIST → LESSON";

  const gapTopics = pickTop(gaps, 5).map(item => item.topic);
  const candidateTopics = unique([
    ...profile.topicPool,
    ...gapTopics
  ]);

  return candidateTopics
    .map(topic => ({
      topic,
      score: scoreTopic(topic, patterns, gaps)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      topic: item.topic,
      reason: \`Channel profile: \${profile.type}. Matches patterns: \${topPatterns.join(", ")}\`,
      suggested_formula: topFormula
    }));
}

function buildHookSuggestions(patterns = [], channel = {}) {
  const names = patterns.map(item => item.pattern);
  const profile = getChannelProfile(channel);

  const hooks = [...profile.hookBase];

  if (names.includes("real_story")) {
    hooks.push("Ye kahani sach hai, lekin iska twist kisi film se kam nahi...");
  }

  if (names.includes("horror")) {
    hooks.push("Raat ke andhere me jo hua, uska jawab aaj tak nahi mila...");
  }

  if (names.includes("true_crime")) {
    hooks.push("Ek chhoti si galti ne case ko aisa mod diya jahan se wapas lautna mushkil tha...");
  }

  if (names.includes("mystery")) {
    hooks.push("Saboot mile, gawah mile, lekin sach aaj bhi adhoora hai...");
  }

  return unique(hooks).slice(0, 6);
}

function buildTitleSuggestions(topics = []) {
  return topics.map(item => ({
    topic: item.topic,
    titles: [
      \`\${item.topic}: ek kahani jisme hidden warning chhupi thi\`,
      \`\${item.topic} ka woh sach jo pehle kisi ko samajh nahi aaya\`,
      \`\${item.topic}: real story, shocking twist\`
    ]
  }));
}

module.exports = {
  buildRecommendedTopics,
  buildHookSuggestions,
  buildTitleSuggestions,
  getChannelProfile
};
`;

const serviceCode = `const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");

const {
  buildRecommendedTopics,
  buildHookSuggestions,
  buildTitleSuggestions
} = require("../core/recommendation_builder");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");

const runtimeResult = resolveChannelRuntime();
if (!runtimeResult.success) {
  throw new Error(\`Unable to resolve active channel: \${runtimeResult.reason || runtimeResult.status}\`);
}

const channel = runtimeResult.channel;
const outputPath = path.join(outputDir, \`\${channel.channelId}_recommendations.json\`);

const competitorReportPath = path.join(outputDir, "competitor_intelligence_report.json");
const patternReportPath = path.join(outputDir, "pattern_intelligence_report.json");

fs.mkdirSync(outputDir, { recursive: true });

function ensureReport(filePath, command) {
  if (!fs.existsSync(filePath)) {
    execSync(command, { stdio: "inherit" });
  }
}

ensureReport(
  competitorReportPath,
  "node modules/intelligence/services/build_competitor_intelligence.js"
);

ensureReport(
  patternReportPath,
  "node modules/intelligence/services/build_pattern_intelligence.js"
);

const competitorReport = JSON.parse(fs.readFileSync(competitorReportPath, "utf8"));
const patternReport = JSON.parse(fs.readFileSync(patternReportPath, "utf8"));

const recommendedTopics = buildRecommendedTopics({
  patterns: patternReport.top_patterns || [],
  gaps: competitorReport.content_gaps || [],
  formulas: patternReport.story_formulas || [],
  channel
});

const report = {
  generated_at: new Date().toISOString(),
  channel: channel.name,
  channelId: channel.channelId,
  channel_profile: {
    niche: channel.niche,
    language: channel.language,
    contentStyle: channel.contentStyle
  },
  strategy_summary: {
    strongest_patterns: patternReport.top_patterns || [],
    strongest_competitors: patternReport.top_competitors || [],
    best_story_formulas: patternReport.story_formulas || []
  },
  recommended_topics: recommendedTopics,
  hook_suggestions: buildHookSuggestions(patternReport.top_patterns || [], channel),
  title_suggestions: buildTitleSuggestions(recommendedTopics),
  next_action: "Use top recommended topic to generate script brief."
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(\`✅ \${channel.name} recommendations generated\`);
console.log(outputPath);
`;

fs.writeFileSync(builderPath, builderCode);
fs.writeFileSync(servicePath, serviceCode);

console.log("✅ Phase 24.2 channel-aware recommendations patch applied");
console.log("Updated:", builderPath);
console.log("Updated:", servicePath);
