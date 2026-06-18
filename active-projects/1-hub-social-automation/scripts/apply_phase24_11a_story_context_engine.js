const fs = require("fs");

const contextPath = "modules/intelligence/core/story_context_builder.js";
const briefPath = "modules/intelligence/core/script_brief_builder.js";

const contextCode = `function cleanText(value = "") {
  return String(value || "").trim();
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

function pick(items = [], index = 0, fallback = "") {
  return items[index] || items[0] || fallback;
}

function buildStoryContext(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const mode = channel.contentMode || "story";
  const categories = toList(channel.contentCategories);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);
  const hookStyles = toList(channel.hookStyles);

  const primaryKeyword = pick(keywords, 0, cleanTopic);
  const secondaryKeyword = pick(keywords, 1, "detail");
  const thirdKeyword = pick(keywords, 2, "record");
  const primaryPillar = pick(pillars, 0, "hidden issue");
  const secondaryPillar = pick(pillars, 1, "old connection");
  const primaryCategory = pick(categories, 0, mode);

  return {
    topic: cleanTopic,
    mode,
    category: primaryCategory,
    atmosphere: hookStyles.includes("shock")
      ? "unexpected and tense"
      : hookStyles.includes("curiosity")
        ? "curious and suspenseful"
        : "focused and serious",
    location_context: primaryKeyword,
    central_tension: primaryPillar,
    trigger_detail: secondaryKeyword,
    evidence_object: thirdKeyword,
    twist_source: secondaryPillar,
    audience_context: channel.targetAudience || "general audience",
    visual_style: channel.visualStyle || ""
  };
}

module.exports = {
  buildStoryContext
};
`;

fs.writeFileSync(contextPath, contextCode);

let briefCode = fs.readFileSync(briefPath, "utf8");

if (!briefCode.includes("story_context_builder")) {
  briefCode = briefCode.replace(
    `function normalizeTopic(topic = "") {`,
    `const { buildStoryContext } = require("./story_context_builder");

function normalizeTopic(topic = "") {`
  );
}

if (!briefCode.includes("story_context: buildStoryContext(topic, channel),")) {
  briefCode = briefCode.replace(
    `      story_skeleton: buildStorySkeleton(topic, channel),`,
    `      story_context: buildStoryContext(topic, channel),
      story_skeleton: buildStorySkeleton(topic, channel),`
  );
}

fs.writeFileSync(briefPath, briefCode);

console.log("✅ Phase 24.11A story context engine applied");
console.log("Created:", contextPath);
console.log("Updated:", briefPath);
