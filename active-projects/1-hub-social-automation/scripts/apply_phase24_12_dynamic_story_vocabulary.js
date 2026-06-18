const fs = require("fs");

const filePath = "modules/intelligence/core/story_context_builder.js";

const code = `function cleanText(value = "") {
  return String(value || "").trim();
}

function normalize(value = "") {
  return cleanText(value).toLowerCase().replace(/_/g, " ");
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
  return Array.from(new Set(items.map(item => cleanText(item)).filter(Boolean)));
}

function scoreTerm(term = "", topic = "") {
  const t = normalize(topic);
  const x = normalize(term);

  if (!x) return 0;
  if (t.includes(x)) return 5;

  return x.split(/\\s+/).filter(word => word.length > 3 && t.includes(word)).length;
}

function rankTerms(terms = [], topic = "") {
  return unique(terms)
    .map(term => ({ term, score: scoreTerm(term, topic) }))
    .sort((a, b) => b.score - a.score || a.term.length - b.term.length)
    .map(item => item.term);
}

function pickRanked(terms = [], topic = "", index = 0, fallback = "") {
  const ranked = rankTerms(terms, topic);
  return ranked[index] || ranked[0] || fallback;
}

function deriveTopicVocabulary(topic = "", channel = {}) {
  const categories = toList(channel.contentCategories);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);

  const allTerms = unique([
    ...keywords,
    ...categories,
    ...pillars,
    ...normalize(topic).split(/\\s+/).filter(word => word.length > 3)
  ]);

  return {
    primary: pickRanked(allTerms, topic, 0, topic),
    secondary: pickRanked(allTerms, topic, 1, "detail"),
    tertiary: pickRanked(allTerms, topic, 2, "record"),
    tension: pickRanked([...pillars, ...categories, ...keywords], topic, 0, "hidden issue"),
    twist: pickRanked([...pillars.slice(1), ...categories, ...keywords], topic, 1, "old connection")
  };
}

function buildStoryContext(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const mode = channel.contentMode || "story";
  const categories = toList(channel.contentCategories);
  const hookStyles = toList(channel.hookStyles);
  const vocabulary = deriveTopicVocabulary(cleanTopic, channel);

  const primaryCategory = pickRanked(categories, cleanTopic, 0, mode);

  return {
    topic: cleanTopic,
    mode,
    category: primaryCategory,
    atmosphere: hookStyles.includes("shock")
      ? "unexpected tension"
      : hookStyles.includes("curiosity")
        ? "slow suspense"
        : "serious focus",
    location_context: vocabulary.primary,
    central_tension: vocabulary.tension,
    trigger_detail: vocabulary.secondary,
    evidence_object: vocabulary.tertiary,
    twist_source: vocabulary.twist,
    audience_context: channel.targetAudience || "general audience",
    visual_style: channel.visualStyle || "",
    vocabulary
  };
}

module.exports = {
  buildStoryContext,
  deriveTopicVocabulary,
  rankTerms
};
`;

fs.writeFileSync(filePath, code);

console.log("✅ Phase 24.12 dynamic story vocabulary patch applied");
console.log("Updated:", filePath);
