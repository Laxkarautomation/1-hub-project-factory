const fs = require("fs");

const filePath = "modules/intelligence/core/recommendation_builder.js";

const code = `function pickTop(items = [], count = 5) {
  return items.slice(0, count);
}

function cleanText(value = "") {
  return String(value || "").trim().toLowerCase();
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

function unique(items = []) {
  return Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));
}

function wordsOf(value = "") {
  return cleanText(value).replace(/[^a-z0-9 ]/g, " ").split(/\\s+/).filter(Boolean);
}

function buildPhrase(parts = []) {
  const words = [];
  for (const part of parts) {
    for (const word of wordsOf(part)) {
      if (!words.includes(word)) words.push(word);
    }
  }
  return words.join(" ");
}

function getChannelProfile(channel = {}) {
  const contentMode = channel.contentMode || "story";
  const categories = toList(channel.contentCategories);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);
  const blockedCategories = toList(channel.blockedCategories);
  const blockedKeywords = toList(channel.blockedKeywords);
  const hookStyles = toList(channel.hookStyles);
  const storyFormulas = toList(channel.storyFormulas);

  const topicPool = buildTopicPool({
    categories,
    pillars,
    keywords,
    contentMode
  });

  const hookBase = buildHookBase({
    hookStyles,
    categories,
    pillars,
    keywords,
    contentMode
  });

  return {
    type: contentMode || "strategy",
    contentMode,
    categories,
    pillars,
    keywords,
    blockedCategories,
    blockedKeywords,
    hookStyles,
    storyFormulas,
    topicPool,
    hookBase
  };
}

function buildTopicPool({ categories = [], pillars = [], keywords = [], contentMode = "" }) {
  const direct = unique([
    ...pillars,
    ...categories,
    ...keywords
  ]);

  const combined = [];

  for (const keyword of keywords) {
    for (const category of categories) {
      combined.push(buildPhrase([keyword, category]));
    }
  }

  for (const keyword of keywords) {
    for (const pillar of pillars) {
      combined.push(buildPhrase([keyword, pillar]));
    }
  }

  if (contentMode) {
    for (const keyword of keywords) {
      combined.push(buildPhrase([keyword, contentMode]));
    }
  }

  return unique([
    ...combined,
    ...direct
  ]).slice(0, 50);
}

function buildHookBase({ hookStyles = [], categories = [], pillars = [], keywords = [], contentMode = "" }) {
  const mainCategory = categories[0] || pillars[0] || keywords[0] || contentMode || "story";
  const mainKeyword = keywords[0] || mainCategory;

  const hooks = [];

  if (hookStyles.includes("curiosity")) {
    hooks.push(\`\${mainKeyword} se judi ek baat hai jise log aksar ignore kar dete hain...\`);
  }

  if (hookStyles.includes("shock")) {
    hooks.push(\`\${mainCategory} me ek aisa twist aaya jiske baad poori kahani badal gayi...\`);
  }

  if (hookStyles.includes("unanswered_question")) {
    hooks.push(\`Sawal simple tha, lekin \${mainKeyword} ka jawab aaj tak clear nahi hua...\`);
  }

  if (hookStyles.includes("problem_solution")) {
    hooks.push(\`\${mainKeyword} ki problem ka solution aksar ek chhoti si detail me chhupa hota hai...\`);
  }

  if (hookStyles.includes("trust")) {
    hooks.push(\`\${mainKeyword} me trust zaroori hai, lekin bina verify kiye decision mehenga pad sakta hai...\`);
  }

  if (hookStyles.includes("local_advice")) {
    hooks.push(\`Local level par \${mainKeyword} me ek chhoti mistake poori file rok sakti hai...\`);
  }

  if (!hooks.length) {
    hooks.push(\`\${mainKeyword} se judi ek kahani hai jo end tak sochne par majboor kar degi...\`);
  }

  return unique(hooks).slice(0, 6);
}

function isBlockedTopic(topic, profile) {
  const text = cleanText(topic);
  return [...profile.blockedCategories, ...profile.blockedKeywords].some((blocked) => {
    const blockedText = cleanText(blocked);
    return blockedText && text.includes(blockedText);
  });
}

function scoreTopic(topic, patterns = [], gaps = [], profile = {}) {
  const text = cleanText(topic);
  const patternNames = patterns.map(item => cleanText(item.pattern));
  const gapTopics = gaps.map(item => cleanText(item.topic));

  let score = 0;

  for (const pattern of patternNames) {
    const patternText = pattern.replace("_", " ");
    if (text.includes(patternText)) score += 2;
  }

  for (const category of profile.categories || []) {
    const categoryText = cleanText(category).replace("_", " ");
    if (categoryText && text.includes(categoryText)) score += 4;
  }

  for (const keyword of profile.keywords || []) {
    const keywordText = cleanText(keyword);
    if (keywordText && text.includes(keywordText)) score += 3;
  }

  for (const pillar of profile.pillars || []) {
    const pillarText = cleanText(pillar);
    const pillarWords = pillarText.split(/\\s+/).filter(word => word.length > 3);
    for (const word of pillarWords) {
      if (text.includes(word)) score += 1;
    }
  }

  for (const gap of gapTopics) {
    if (gap && text.includes(gap)) score += 5;
    const gapWords = gap.split(/\\s+/).filter(word => word.length > 3);
    for (const word of gapWords) {
      if (text.includes(word)) score += 1;
    }
  }

  if (isBlockedTopic(topic, profile)) score -= 100;

  return score;
}

function buildRecommendedTopics({ patterns = [], gaps = [], formulas = [], channel = {} }) {
  const profile = getChannelProfile(channel);
  const topPatterns = pickTop(patterns, 3).map(item => item.pattern);

  const strategyFormula = profile.storyFormulas[0];
  const topFormula = strategyFormula || formulas[0]?.formula || "STORY → BUILDUP → TWIST → LESSON";

  const gapTopics = pickTop(gaps, 10).map(item => item.topic);
  const candidateTopics = unique([
    ...gapTopics,
    ...profile.topicPool
  ]).filter(topic => !isBlockedTopic(topic, profile));

  return candidateTopics
    .map(topic => ({
      topic,
      score: scoreTopic(topic, patterns, gaps, profile)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      topic: item.topic,
      reason: \`Channel strategy: \${profile.contentMode}. Matches patterns: \${topPatterns.join(", ")}\`,
      suggested_formula: topFormula
    }));
}

function buildHookSuggestions(patterns = [], channel = {}) {
  const profile = getChannelProfile(channel);
  const hooks = [...profile.hookBase];

  const names = patterns.map(item => item.pattern);
  const mainKeyword = profile.keywords[0] || profile.categories[0] || profile.contentMode || "story";

  if (names.includes("real_story")) {
    hooks.push(\`\${mainKeyword} ki ye kahani real lagti hai kyunki isme warning chhupi hai...\`);
  }

  if (names.includes("horror")) {
    hooks.push(\`\${mainKeyword} me jo hua, uska jawab seedha nahi tha...\`);
  }

  if (names.includes("true_crime")) {
    hooks.push(\`\${mainKeyword} se judi ek chhoti detail ne poora case badal diya...\`);
  }

  if (names.includes("mystery")) {
    hooks.push(\`\${mainKeyword} ka sach saamne tha, phir bhi log use samajh nahi paaye...\`);
  }

  return unique(hooks).slice(0, 6);
}

function buildTitleSuggestions(topics = []) {
  return topics.map(item => ({
    topic: item.topic,
    titles: [
      \`\${item.topic}: ek story jisme hidden warning chhupi thi\`,
      \`\${item.topic} ka woh sach jo pehle kisi ko samajh nahi aaya\`,
      \`\${item.topic}: real story, shocking twist\`
    ]
  }));
}

module.exports = {
  buildRecommendedTopics,
  buildHookSuggestions,
  buildTitleSuggestions,
  getChannelProfile,
  buildTopicPool
};
`;

fs.writeFileSync(filePath, code);

console.log("✅ Phase 24.5 strategy-driven recommendations patch applied");
console.log("Updated:", filePath);
