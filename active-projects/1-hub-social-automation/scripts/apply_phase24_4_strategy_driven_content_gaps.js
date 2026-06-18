const fs = require("fs");

const gapFinderPath = "modules/intelligence/core/content_gap_finder.js";
const competitorServicePath = "modules/intelligence/services/build_competitor_intelligence.js";
const channelsPath = "modules/channels/storage/channels.json";

const gapFinderCode = `function normalize(text = "") {
  return String(text || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
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

function buildFallbackTopics(channel = {}) {
  const nicheWords = normalize(channel.niche || "")
    .split(/\\s+/)
    .filter((word) => word.length > 3);

  const mode = channel.contentMode ? [channel.contentMode] : [];
  const pillars = toList(channel.contentPillars);
  const categories = toList(channel.contentCategories);
  const keywords = toList(channel.topicKeywords);

  const base = unique([
    ...categories,
    ...pillars,
    ...keywords,
    ...mode,
    ...nicheWords
  ]);

  if (!base.length) {
    return [
      "real life story",
      "useful lesson",
      "hidden truth",
      "interesting facts",
      "audience warning"
    ];
  }

  const topics = [];

  for (const item of base) {
    topics.push(item);
    topics.push(\`\${item} story\`);
    topics.push(\`\${item} facts\`);
  }

  return unique(topics).slice(0, 25);
}

function buildCandidateTopics(channel = {}) {
  const categories = toList(channel.contentCategories);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);

  const direct = unique([
    ...categories,
    ...pillars,
    ...keywords
  ]);

  const combined = [];

  for (const category of categories) {
    for (const keyword of keywords) {
      combined.push(\`\${keyword} \${category}\`);
    }
  }

  for (const pillar of pillars) {
    for (const keyword of keywords) {
      combined.push(\`\${keyword} \${pillar}\`);
    }
  }

  const candidates = unique([
    ...combined,
    ...direct,
    ...buildFallbackTopics(channel)
  ]);

  return candidates.slice(0, 40);
}

function isBlocked(topic, channel = {}) {
  const normalizedTopic = normalize(topic);
  const blockedCategories = toList(channel.blockedCategories);
  const blockedKeywords = toList(channel.blockedKeywords);

  return [...blockedCategories, ...blockedKeywords].some((blocked) => {
    const normalizedBlocked = normalize(blocked);
    return normalizedBlocked && normalizedTopic.includes(normalizedBlocked);
  });
}

function findContentGaps(videos = [], options = {}) {
  const channel = options.channel || {};
  const corpus = normalize(videos.map(video => video.title || "").join(" "));
  const candidateTopics = buildCandidateTopics(channel).filter(topic => !isBlocked(topic, channel));

  return candidateTopics
    .map(topic => {
      const words = normalize(topic)
        .split(" ")
        .filter(Boolean);

      const matched_words = words.filter(word => corpus.includes(word));
      const coverage = words.length ? matched_words.length / words.length : 0;

      return {
        topic,
        coverage: Number(coverage.toFixed(2)),
        opportunity_score: Number((1 - coverage).toFixed(2)),
        matched_words,
        source: "channel_strategy"
      };
    })
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 20);
}

module.exports = {
  findContentGaps,
  buildCandidateTopics,
  isBlocked
};
`;

fs.writeFileSync(gapFinderPath, gapFinderCode);

let serviceCode = fs.readFileSync(competitorServicePath, "utf8");

if (!serviceCode.includes("resolveChannelRuntime")) {
  serviceCode = serviceCode.replace(
    `const { calculateQuality } = require("../core/quality_filter");`,
    `const { calculateQuality } = require("../core/quality_filter");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");`
  );
}

serviceCode = serviceCode.replace(
  `function run() {
  const videos = readJson(inputPath, []);`,
  `function run() {
  const videos = readJson(inputPath, []);
  const runtimeResult = resolveChannelRuntime();
  const channel = runtimeResult.success ? runtimeResult.channel : {};`
);

serviceCode = serviceCode.replace(
  `    hook_summary: buildHookSummary(scoredVideos),
    content_gaps: findContentGaps(scoredVideos)`,
  `    channel: channel.name || channel.channelId || "active_channel",
    channelId: channel.channelId || "active_channel",
    channel_strategy: {
      niche: channel.niche || "",
      contentMode: channel.contentMode || "",
      contentCategories: channel.contentCategories || [],
      blockedCategories: channel.blockedCategories || [],
      contentPillars: channel.contentPillars || [],
      topicKeywords: channel.topicKeywords || [],
      blockedKeywords: channel.blockedKeywords || [],
      storyFormulas: channel.storyFormulas || [],
      hookStyles: channel.hookStyles || [],
      visualStyle: channel.visualStyle || "",
      targetAudience: channel.targetAudience || ""
    },
    hook_summary: buildHookSummary(scoredVideos),
    content_gaps: findContentGaps(scoredVideos, { channel })`
);

fs.writeFileSync(competitorServicePath, serviceCode);

const channels = JSON.parse(fs.readFileSync(channelsPath, "utf8"));

const upgraded = channels.map((channel) => {
  if (channel.channelId === "unraaz") {
    return {
      ...channel,
      contentMode: channel.contentMode || "story",
      contentCategories: channel.contentCategories || ["mystery", "true_crime", "real_incident", "money_lesson"],
      blockedCategories: channel.blockedCategories || ["loan_lead_generation", "generic_finance"],
      contentPillars: channel.contentPillars || ["unsolved stories", "real incidents", "crime twists", "money greed lessons"],
      topicKeywords: channel.topicKeywords || ["village", "missing", "crime", "mystery", "incident", "greed", "documents"],
      blockedKeywords: channel.blockedKeywords || ["home loan", "cibil", "msme", "emi"],
      storyFormulas: channel.storyFormulas || ["REAL INCIDENT → BUILDUP → TWIST → LESSON"],
      hookStyles: channel.hookStyles || ["curiosity", "shock", "unanswered_question"],
      visualStyle: channel.visualStyle || "dark realistic documentary mystery, 9:16 cinematic",
      targetAudience: channel.targetAudience || "Hindi/Hinglish mystery and real story viewers"
    };
  }

  if (channel.channelId === "malwa_loan_hub") {
    return {
      ...channel,
      contentMode: channel.contentMode || "education",
      contentCategories: channel.contentCategories || ["home_loan", "business_loan", "msme_loan", "cibil", "loan_documents"],
      blockedCategories: channel.blockedCategories || ["horror", "crime", "adult"],
      contentPillars: channel.contentPillars || ["loan education", "local trust", "document guidance", "customer awareness"],
      topicKeywords: channel.topicKeywords || ["home loan", "business loan", "cibil", "emi", "property", "documents", "approval"],
      blockedKeywords: channel.blockedKeywords || ["murder", "ghost", "missing person", "crime scene"],
      storyFormulas: channel.storyFormulas || ["PROBLEM → EXPLANATION → SOLUTION → CTA"],
      hookStyles: channel.hookStyles || ["problem_solution", "trust", "local_advice"],
      visualStyle: channel.visualStyle || "clean local finance visuals, trust-building, Hindi text, 9:16",
      targetAudience: channel.targetAudience || "Mandsaur Ratlam Neemuch loan customers and small business owners"
    };
  }

  return channel;
});

fs.writeFileSync(channelsPath, JSON.stringify(upgraded, null, 2));

console.log("✅ Phase 24.4 strategy-driven content gaps patch applied");
console.log("Updated:", gapFinderPath);
console.log("Updated:", competitorServicePath);
console.log("Updated:", channelsPath);
