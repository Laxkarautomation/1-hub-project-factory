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
    match: ["historical", "history", "ancient"],
    location: ["old fort", "ancient temple", "forgotten palace", "ruined haveli", "abandoned archive room", "buried stepwell", "old museum basement", "royal courtyard", "forgotten tunnel", "ancient library"],
    tension: ["sealed record", "missing page", "forgotten event", "erased royal note", "hidden inscription", "unexplained date mismatch", "lost witness account", "forbidden family record", "buried political secret", "broken timeline"],
    trigger: ["old diary", "hidden room", "archaeology note", "dusty map", "restored photograph", "temple wall marking", "museum register", "forgotten letter", "broken statue clue", "archival stamp"],
    evidence: ["sealed document", "carved symbol", "archive file", "old coin", "faded photograph", "royal seal", "land record", "temple inscription", "newspaper cutting", "handwritten register"],
    twist: ["forgotten history", "royal secret", "buried truth", "wrongly recorded event", "hidden heir angle", "erased betrayal", "political cover-up", "misread legend", "lost identity", "truth hidden in public"]
  },
  {
    id: "true_crime_case",
    match: ["true crime", "crime", "case", "police"],
    location: ["small town police station", "quiet street", "old case file room", "closed shop lane", "bus stand corner", "empty apartment corridor", "district court hallway", "railway platform", "abandoned warehouse", "hospital waiting area"],
    tension: ["timeline mismatch", "conflicting witness statement", "missing evidence", "changed statement", "unanswered phone call", "wrong location detail", "deleted message", "last-minute alibi", "silent witness", "unmatched CCTV timing"],
    trigger: ["phone record", "anonymous call", "last seen detail", "CCTV clip", "missed call log", "neighbour statement", "half-burnt note", "changed route", "old complaint copy", "late night message"],
    evidence: ["case file", "witness note", "forensic report", "CCTV timestamp", "call detail record", "vehicle entry slip", "blood-stained cloth", "police diary page", "location ping", "unsigned statement"],
    twist: ["hidden suspect", "false witness", "old case connection", "planned alibi", "family angle", "wrong victim assumption", "fake accident theory", "trusted person betrayal", "suppressed complaint", "motive revealed late"]
  },
  {
    id: "village_mystery",
    match: ["village", "gaon", "rural"],
    location: ["small Indian village", "empty village road", "old village house", "abandoned well", "village temple courtyard", "kaccha road near fields", "closed panchayat room", "old banyan tree", "deserted school building", "lonely farm hut"],
    tension: ["sudden disappearance", "strange village rumour", "silent local witness", "forbidden local story", "night-time fear", "family silence", "land dispute pressure", "unknown visitor", "hidden village warning", "ritual-like pattern"],
    trigger: ["old letter", "locked room", "late night sound", "missing cattle clue", "temple bell at midnight", "unknown footprint", "panchayat register entry", "broken lantern", "field boundary mark", "childhood rumour"],
    evidence: ["muddy footprint", "handwritten note", "broken object", "old land paper", "village register", "red cloth piece", "rusted key", "charcoal mark", "hidden photograph", "forgotten complaint"],
    twist: ["family secret", "hidden local dispute", "forgotten promise", "land ownership truth", "fake ghost story", "old revenge", "panchayat cover-up", "relationship hidden for years", "fear used as weapon", "truth known by one elder"]
  },
  {
    id: "money_lesson_case",
    match: ["money", "greed", "finance", "business"],
    location: ["small office", "local market", "family business room", "loan desk", "shop backroom", "property dealer office", "cash counter", "bank branch waiting area", "warehouse cabin", "tea stall negotiation"],
    tension: ["greed-driven decision", "hidden financial pressure", "trust mistake", "shortcut temptation", "fake profit promise", "ignored risk", "family money pressure", "wrong advice", "overconfidence trap", "unverified deal"],
    trigger: ["signed paper", "missed warning", "cash transaction", "loan promise", "advance payment", "blank cheque", "WhatsApp screenshot", "property token receipt", "friendly guarantee", "urgent deadline"],
    evidence: ["bank slip", "old receipt", "written agreement", "cheque copy", "loan statement", "payment screenshot", "stamp paper", "ledger entry", "voice note", "signed guarantee"],
    twist: ["trusted person angle", "hidden debt", "wrong calculation", "fake partnership", "greed masked as opportunity", "one clause trap", "family member risk", "delayed loss reveal", "paperwork loophole", "small mistake became disaster"]
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

function scoreAgainstSource(matchTerms = [], sourceText = "", weight = 1) {
  const haystack = normalize(sourceText);
  const words = haystack.split(/\s+/).filter(Boolean);

  return matchTerms.reduce((score, term) => {
    const normalized = normalize(term);
    if (!normalized) return score;

    const isPhrase = normalized.includes(" ");
    const matched = isPhrase
      ? haystack.includes(normalized)
      : words.includes(normalized);

    return score + (matched ? weight : 0);
  }, 0);
}

function scoreArchetype(archetype, topic = "", channel = {}) {
  const matchTerms = archetype.match || [];

  return [
    scoreAgainstSource(matchTerms, topic, 1000),
    scoreAgainstSource(matchTerms, toList(channel.contentCategories).join(" "), 30),
    scoreAgainstSource(matchTerms, toList(channel.contentPillars).join(" "), 20),
    scoreAgainstSource(matchTerms, toList(channel.topicKeywords).join(" "), 10),
    scoreAgainstSource(matchTerms, channel.contentMode, 5)
  ].reduce((total, score) => total + score, 0);
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
