function clean(value = "") {
  return String(value || "").trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase().replace(/_/g, " ");
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

const ARCHETYPES = [
  {
    id: "historical_mystery",
    match: ["historical", "history", "ancient", "india"],
    location: ["old fort", "ancient temple", "forgotten palace"],
    tension: ["sealed record", "missing page", "forgotten event"],
    trigger: ["old diary", "hidden room", "archaeology note"],
    evidence: ["sealed document", "carved symbol", "archive file"],
    twist: ["forgotten history", "royal secret", "buried truth"]
  },
  {
    id: "true_crime_case",
    match: ["true crime", "crime", "case", "police"],
    location: ["small town police station", "quiet street", "old case file room"],
    tension: ["timeline mismatch", "conflicting witness statement", "missing evidence"],
    trigger: ["phone record", "anonymous call", "last seen detail"],
    evidence: ["case file", "witness note", "forensic report"],
    twist: ["hidden suspect", "false witness", "old case connection"]
  },
  {
    id: "village_mystery",
    match: ["village", "gaon", "rural"],
    location: ["small Indian village", "empty village road", "old village house"],
    tension: ["sudden disappearance", "strange village rumour", "silent local witness"],
    trigger: ["old letter", "locked room", "late night sound"],
    evidence: ["muddy footprint", "handwritten note", "broken object"],
    twist: ["family secret", "hidden local dispute", "forgotten promise"]
  },
  {
    id: "money_lesson_case",
    match: ["money", "greed", "finance", "business"],
    location: ["small office", "local market", "family business room"],
    tension: ["greed-driven decision", "hidden financial pressure", "trust mistake"],
    trigger: ["signed paper", "missed warning", "cash transaction"],
    evidence: ["bank slip", "old receipt", "written agreement"],
    twist: ["trusted person angle", "hidden debt", "wrong calculation"]
  },
  {
    id: "facts_explainer",
    match: ["facts", "fact", "science", "education", "explain"],
    location: ["simple explainer setup", "visual comparison", "daily life example"],
    tension: ["common misconception", "ignored detail", "surprising contrast"],
    trigger: ["one simple example", "data point", "visual proof"],
    evidence: ["comparison chart", "real example", "basic logic"],
    twist: ["truth opposite to assumption", "hidden mechanism", "simple explanation"],
  },
  {
    id: "generic_story",
    match: [],
    location: ["normal place", "ordinary day", "simple situation"],
    tension: ["hidden problem", "ignored warning", "unexpected pressure"],
    trigger: ["small clue", "new detail", "strange mismatch"],
    evidence: ["old record", "small proof", "important note"],
    twist: ["unexpected connection", "hidden truth", "late reveal"]
  }
];

function scoreArchetype(archetype, topic = "", channel = {}) {
  const haystack = [
    topic,
    channel.contentMode,
    ...toList(channel.contentCategories),
    ...toList(channel.contentPillars),
    ...toList(channel.topicKeywords)
  ].map(normalize).join(" ");

  return archetype.match.reduce((score, term) => {
    const normalized = normalize(term);
    if (!normalized) return score;
    return score + (haystack.includes(normalized) ? 5 : 0);
  }, 0);
}

function pickFrom(list = [], seed = "") {
  if (!list.length) return "";
  const index = Math.abs(Array.from(normalize(seed)).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % list.length;
  return list[index];
}

function selectTopicArchetype(topic = "", channel = {}) {
  const ranked = ARCHETYPES
    .map(archetype => ({
      ...archetype,
      score: scoreArchetype(archetype, topic, channel)
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0] : ARCHETYPES.find(item => item.id === "generic_story");
}

function buildArchetypeVocabulary(topic = "", channel = {}) {
  const archetype = selectTopicArchetype(topic, channel);

  return {
    archetypeId: archetype.id,
    location: pickFrom(archetype.location, topic),
    tension: pickFrom(archetype.tension, topic),
    trigger: pickFrom(archetype.trigger, topic),
    evidence: pickFrom(archetype.evidence, topic),
    twist: pickFrom(archetype.twist, topic)
  };
}

module.exports = {
  selectTopicArchetype,
  buildArchetypeVocabulary
};
