const { buildArchetypeVocabulary } = require("./topic_archetype_library");

function cleanText(value = "") {
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

  return x.split(/\s+/).filter(word => word.length > 3 && t.includes(word)).length;
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

function pickSeeded(terms = [], seed = "", offset = 0, fallback = "") {
  const list = unique(terms);
  if (!list.length) return fallback;
  const base = Array.from(normalize(seed)).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return list[Math.abs(base + offset) % list.length] || fallback;
}

function buildEscalationStages(topic = "", archetypeVocabulary = {}, vocabulary = {}) {
  const pool = unique([
    archetypeVocabulary.tension,
    archetypeVocabulary.trigger,
    archetypeVocabulary.evidence,
    archetypeVocabulary.twist,
    vocabulary.primary,
    vocabulary.secondary,
    vocabulary.tertiary,
    vocabulary.tension,
    vocabulary.twist
  ]);

  return {
    escalation_stage_1: pickSeeded(
      [
        `${archetypeVocabulary.trigger || vocabulary.secondary} ko pehle ignore kar diya gaya`,
        `${archetypeVocabulary.tension || vocabulary.tension} par kisi ne khulkar baat nahi ki`,
        `${vocabulary.primary || "main clue"} se judi ek chhoti baat repeat hone lagi`,
        `local log ${archetypeVocabulary.evidence || vocabulary.tertiary} ke baare me chup rahe`
      ],
      topic,
      11,
      pool[0] || "pehli detail ignore ho gayi"
    ),
    escalation_stage_2: pickSeeded(
      [
        `${archetypeVocabulary.evidence || vocabulary.tertiary} ne purani story ko doubtful bana diya`,
        `${archetypeVocabulary.tension || vocabulary.tension} aur ${archetypeVocabulary.trigger || vocabulary.secondary} ek dusre se connect hone lage`,
        `ek naya record purani baat se match nahi hua`,
        `${vocabulary.secondary || "second clue"} ne case ko aur complicated bana diya`
      ],
      topic,
      23,
      pool[1] || "dusri detail ne doubt badha diya"
    ),
    escalation_stage_3: pickSeeded(
      [
        `${archetypeVocabulary.twist || vocabulary.twist} ka hint tab mila jab sab clues ek jagah aaye`,
        `jis baat ko coincidence maana gaya tha, wahi pattern nikla`,
        `sabse important witness ya proof last moment par doubtful ho gaya`,
        `${archetypeVocabulary.evidence || vocabulary.tertiary} ne hidden connection expose karna shuru kiya`
      ],
      topic,
      37,
      pool[2] || "teesri detail ne asli angle khol diya"
    )
  };
}

function deriveTopicVocabulary(topic = "", channel = {}) {
  const categories = toList(channel.contentCategories);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);

  const allTerms = unique([
    ...keywords,
    ...categories,
    ...pillars,
    ...normalize(topic).split(/\s+/).filter(word => word.length > 3)
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
  const archetypeVocabulary = buildArchetypeVocabulary(cleanTopic, channel);
  const escalationStages = buildEscalationStages(cleanTopic, archetypeVocabulary, vocabulary);

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
    archetype: archetypeVocabulary.archetypeId,
    location_context: archetypeVocabulary.location || vocabulary.primary,
    central_tension: archetypeVocabulary.tension || vocabulary.tension,
    trigger_detail: archetypeVocabulary.trigger || vocabulary.secondary,
    evidence_object: archetypeVocabulary.evidence || vocabulary.tertiary,
    escalation_stage_1: escalationStages.escalation_stage_1,
    escalation_stage_2: escalationStages.escalation_stage_2,
    escalation_stage_3: escalationStages.escalation_stage_3,
    twist_source: archetypeVocabulary.twist || vocabulary.twist,
    audience_context: channel.targetAudience || "general audience",
    visual_style: channel.visualStyle || "",
    vocabulary,
    archetype_vocabulary: archetypeVocabulary
  };
}

module.exports = {
  buildStoryContext,
  deriveTopicVocabulary,
  rankTerms
};
