function normalize(text = "") {
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

function wordsOf(value = "") {
  return normalize(value).split(" ").filter(Boolean);
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

function buildFallbackTopics(channel = {}) {
  const nicheWords = normalize(channel.niche || "")
    .split(/\s+/)
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
    topics.push(`${item} story`);
    topics.push(`${item} facts`);
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
      combined.push(buildPhrase([keyword, category]));
    }
  }

  for (const pillar of pillars) {
    for (const keyword of keywords) {
      combined.push(buildPhrase([keyword, pillar]));
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
