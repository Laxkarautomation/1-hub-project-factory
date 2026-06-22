function pickTop(items = [], count = 5) {
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

function normalizeText(value = "") {
  return cleanText(value)
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9\s'’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value = "") {
  return normalizeText(value)
    .split(/\s+/)
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : "")
    .join(" ")
    .trim();
}

function safeTopicSeed(value = "") {
  return normalizeText(value)
    .replace(/\b(real|true|story|stories|crime|mystery|horror|incident|incidents|documentary)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsOf(value = "") {
  return cleanText(value).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
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

function hasGenericOnlyTopic(topic = "") {
  const text = cleanText(topic);
  if (!text) return true;

  return [
    /^mystery true crime$/,
    /^crime mystery$/,
    /^real incident$/,
    /^incident true crime$/,
    /^mystery real incident(s)?$/,
    /^mystery real incidents$/
  ].some(pattern => pattern.test(text));
}

function isBlockedRecommendationTopic(topic = "", profile = {}) {
  const text = cleanText(topic);
  if (!text) return true;

  if (hasGenericOnlyTopic(text)) return true;

  return [...profile.blockedCategories, ...profile.blockedKeywords].some((blocked) => {
    const blockedText = cleanText(blocked);
    return blockedText && text.includes(blockedText);
  });
}

function splitTitleSegments(title = "") {
  return normalizeText(title)
    .split(/[:|–—\-]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripTitleNoise(title = "") {
  return normalizeText(title)
    .replace(/[🔥🔥🔥]+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(real stories?|true crime|real|true|horror|crime|story|stories|documentary|hindi|kahani|kahaniyan|sachchi|sachi|in hindi|in hinglish|khooni monday|episode|ep|e\s*\d+|km\s*e\d+)\b/gi, " ")
    .replace(/\b(who|what|when|where|why|how|was|is|are|did|does|do|the|a|an|and|of|to|in|for|with|on|from|by|vs|vs\.|story|storys|stories)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitleNouns(title = "") {
  return stripTitleNoise(title)
    .replace(/[^a-z0-9\s'’-]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
}

function buildStorySeedFromTitle(title = "", gapTopic = "", patternName = "") {
  const rawTitle = normalizeText(title);
  const segments = splitTitleSegments(title)
    .map((segment) => stripTitleNoise(segment))
    .filter(Boolean);
  const titleNoNoise = stripTitleNoise(rawTitle);
  const nouns = extractTitleNouns(titleNoNoise);

  const hasNumericAge = /\b\d+\s*(year[- ]?old|saal purane?)\b/i.test(rawTitle);
  const hasDeath = /\bdeath\b/i.test(rawTitle);
  const hasMurder = /\bmurder\b/i.test(rawTitle);
  const hasSolved = /\bsolved\b/i.test(rawTitle);
  const hasHaunted = /\bhaunted|ghost|paranormal|dybbuk\b/i.test(rawTitle);
  const hasKillers = /\bkillers?\b/i.test(rawTitle);
  const hasGang = /\bgang|mafia|cartel\b/i.test(rawTitle);
  const hasDoll = /\bdoll\b/i.test(rawTitle);
  const hasCastle = /\bcastle\b/i.test(rawTitle);
  const hasHouse = /\bhouse|mansion\b/i.test(rawTitle);
  const hasReveal = /\breveal|unearthing|hidden|unsolved|mystery\b/i.test(rawTitle);
  const ageMatch = rawTitle.match(/\b(\d+)\s*(year[- ]?old|saal purane?)\b/i);
  const subjectFromSegment = segments.find((segment) => {
    const wordCount = segment.split(/\s+/).filter(Boolean).length;
    return wordCount >= 2 && !hasGenericOnlyTopic(segment);
  }) || segments[0] || "";
  const nounLead = nouns.slice(0, 2).join(" ") || nouns.slice(0, 3).join(" ");

  let subject = "";
  if (ageMatch && hasMurder) subject = `${ageMatch[1]} saal purane murder case`;
  else if (ageMatch && hasDeath) subject = `${ageMatch[1]} saal purane death case`;
  else if (ageMatch) subject = `${ageMatch[1]} saal purane case`;
  else if (subjectFromSegment) subject = subjectFromSegment;
  else if (hasDeath) subject = `${nounLead || "death"} case`;
  else if (hasMurder) subject = "murder case";
  else if (hasGang) subject = `${nounLead || "crime network"} network`;
  else if (hasKillers) subject = `${nounLead || "killer"} killers`;
  else if (hasDoll) subject = `${nounLead || "haunted doll"} doll`;
  else if (hasCastle || hasHouse) subject = `${nounLead || "haunted place"} place`;
  else if (hasHaunted) subject = nounLead || "haunted case";
  else subject = nouns.slice(0, 3).join(" ") || titleNoNoise || title;

  const base = safeTopicSeed(subject) || safeTopicSeed(gapTopic) || safeTopicSeed(title);

  let angle = "";
  if (hasSolved || hasReveal) angle = "ka late reveal";
  else if (hasHaunted || hasDoll || hasCastle || hasHouse) angle = "ka haunted twist";
  else if (hasKillers) angle = "ka dark angle";
  else if (hasGang) angle = "ka hidden network";
  else if (hasDeath || hasMurder) angle = "ka hidden angle";
  else angle = "ka unsolved twist";

  const core = titleCase(base);
  const suffix = titleCase(angle);
  const storySeed = cleanText(`${core} ${suffix}`.replace(/\bKa\b/g, "ka"));

  const compact = storySeed
    || titleCase(safeTopicSeed(title))
    || titleCase(cleanText(gapTopic));

  return compact.replace(/\bKa\b/g, "ka");
}

function buildSourceHint(title = "", sourceName = "") {
  const segments = splitTitleSegments(title);
  const source = cleanText(sourceName);
  const titleHint = stripTitleNoise(segments[0] || title) || stripTitleNoise(title) || title;

  return [
    source ? `competitor:${source}` : "",
    titleHint ? `title:${titleHint}` : ""
  ].filter(Boolean).join(" | ");
}

function buildCompetitorTopicCandidates(videos = [], profile = {}, gaps = [], patterns = []) {
  const topGapTopics = pickTop(gaps, 8).map(item => cleanText(item.topic));
  const topPatternName = cleanText(pickTop(patterns, 1)[0]?.pattern || "");
  const candidates = [];

  for (const video of videos) {
    const title = cleanText(video?.title || video?.source_title || video?.name || video);
    if (!title) continue;

    const sourceName = cleanText(video?.source_name || video?.source || "");
    const gapTopic = topGapTopics.find(Boolean) || profile.topicPool[0] || "";
    const seed = buildStorySeedFromTitle(title, gapTopic, topPatternName);
    candidates.push({
      topic: seed,
      story_seed: seed,
      source_hint: buildSourceHint(title, sourceName),
      source_title: title,
      source_name: sourceName,
      reason: `Competitor title seed from ${sourceName || "competitor"}`
    });
  }

  return candidates;
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
    hooks.push(`${mainKeyword} se judi ek baat hai jise log aksar ignore kar dete hain...`);
  }

  if (hookStyles.includes("shock")) {
    hooks.push(`${mainCategory} me ek aisa twist aaya jiske baad poori kahani badal gayi...`);
  }

  if (hookStyles.includes("unanswered_question")) {
    hooks.push(`Sawal simple tha, lekin ${mainKeyword} ka jawab aaj tak clear nahi hua...`);
  }

  if (hookStyles.includes("problem_solution")) {
    hooks.push(`${mainKeyword} ki problem ka solution aksar ek chhoti si detail me chhupa hota hai...`);
  }

  if (hookStyles.includes("trust")) {
    hooks.push(`${mainKeyword} me trust zaroori hai, lekin bina verify kiye decision mehenga pad sakta hai...`);
  }

  if (hookStyles.includes("local_advice")) {
    hooks.push(`Local level par ${mainKeyword} me ek chhoti mistake poori file rok sakti hai...`);
  }

  if (!hooks.length) {
    hooks.push(`${mainKeyword} se judi ek kahani hai jo end tak sochne par majboor kar degi...`);
  }

  return unique(hooks).slice(0, 6);
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
    const pillarWords = pillarText.split(/\s+/).filter(word => word.length > 3);
    for (const word of pillarWords) {
      if (text.includes(word)) score += 1;
    }
  }

  for (const gap of gapTopics) {
    if (gap && text.includes(gap)) score += 5;
    const gapWords = gap.split(/\s+/).filter(word => word.length > 3);
    for (const word of gapWords) {
      if (text.includes(word)) score += 1;
    }
  }

  if (isBlockedRecommendationTopic(topic, profile)) score -= 100;

  return score;
}

function buildRecommendedTopics({
  patterns = [],
  gaps = [],
  formulas = [],
  channel = {},
  competitorVideos = [],
  sourceTitles = []
}) {
  const profile = getChannelProfile(channel);
  const topPatterns = pickTop(patterns, 3).map(item => item.pattern);

  const strategyFormula = profile.storyFormulas[0];
  const topFormula = strategyFormula || formulas[0]?.formula || "STORY → BUILDUP → TWIST → LESSON";

  const gapTopics = pickTop(gaps, 10).map(item => item.topic);
  const competitorTitlePool = unique([
    ...toList(sourceTitles),
    ...competitorVideos.map(item => item.title || item.source_title || item.name || "")
  ]).filter(Boolean);

  const competitorDerived = competitorTitlePool.length
    ? buildCompetitorTopicCandidates(
      competitorVideos.length ? competitorVideos : competitorTitlePool.map(title => ({ title })),
      profile,
      gaps,
      patterns
    )
    : [];

  const fallbackTopics = unique([
    ...gapTopics,
    ...profile.topicPool
  ]).filter(topic => !isBlockedRecommendationTopic(topic, profile));

  const candidateRows = [];
  const seenTopics = new Set();

  for (const item of competitorDerived) {
    if (!item?.topic || isBlockedRecommendationTopic(item.topic, profile) || seenTopics.has(item.topic)) continue;
    seenTopics.add(item.topic);
    candidateRows.push({
      ...item,
      score: scoreTopic(item.topic, patterns, gaps, profile),
      is_competitor_seed: true
    });
  }

  for (const topic of fallbackTopics) {
    if (!topic || seenTopics.has(topic)) continue;
    seenTopics.add(topic);
    candidateRows.push({
      topic,
      story_seed: topic,
      source_hint: null,
      source_title: null,
      score: scoreTopic(topic, patterns, gaps, profile),
      reason: `Channel strategy fallback: ${profile.contentMode}`,
      is_competitor_seed: false
    });
  }

  return candidateRows
    .sort((a, b) => {
      if (a.is_competitor_seed !== b.is_competitor_seed) return a.is_competitor_seed ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.topic.localeCompare(b.topic);
    })
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      topic: item.topic,
      story_seed: item.story_seed,
      source_hint: item.source_hint || undefined,
      reason: item.reason + (topPatterns.length ? ` | Patterns: ${topPatterns.join(", ")}` : ""),
      suggested_formula: topFormula
    }));
}

function buildHookSuggestions(patterns = [], channel = {}) {
  const profile = getChannelProfile(channel);
  const hooks = [...profile.hookBase];

  const names = patterns.map(item => item.pattern);
  const mainKeyword = profile.keywords[0] || profile.categories[0] || profile.contentMode || "story";

  if (names.includes("real_story")) {
    hooks.push(`${mainKeyword} ki ye kahani real lagti hai kyunki isme warning chhupi hai...`);
  }

  if (names.includes("horror")) {
    hooks.push(`${mainKeyword} me jo hua, uska jawab seedha nahi tha...`);
  }

  if (names.includes("true_crime")) {
    hooks.push(`${mainKeyword} se judi ek chhoti detail ne poora case badal diya...`);
  }

  if (names.includes("mystery")) {
    hooks.push(`${mainKeyword} ka sach saamne tha, phir bhi log use samajh nahi paaye...`);
  }

  return unique(hooks).slice(0, 6);
}

function buildTitleSuggestions(topics = []) {
  return topics.map(item => ({
    topic: item.topic,
    titles: [
      `${item.topic}: ek story jisme hidden warning chhupi thi`,
      `${item.topic} ka woh sach jo pehle kisi ko samajh nahi aaya`,
      `${item.topic}: real story, shocking twist`
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
