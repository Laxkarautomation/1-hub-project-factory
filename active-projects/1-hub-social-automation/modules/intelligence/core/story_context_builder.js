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

function displayTopicForArchetype(topic = "", archetype = "general_story") {
  const cleanTopic = cleanText(topic).replace(/_/g, " ").replace(/\s+/g, " ");
  const fallback = cleanTopic || "ye kahani";

  const displayMap = {
    historical_mystery: "ye historical mystery",
    true_crime_case: "ye case",
    village_mystery: "ye gaon ki kahani",
    money_lesson_case: "ye financial case",
    general_story: fallback
  };

  return displayMap[archetype] || fallback;
}

function buildNarrativeSignals(topic = "", archetypeVocabulary = {}, vocabulary = {}) {
  const archetype = archetypeVocabulary.archetypeId || "general_story";
  const trigger = archetypeVocabulary.trigger || vocabulary.secondary || "ek chhoti detail";
  const evidence = archetypeVocabulary.evidence || vocabulary.tertiary || "ek purana record";
  const tension = archetypeVocabulary.tension || vocabulary.tension || "ek ajeeb problem";
  const twist = archetypeVocabulary.twist || vocabulary.twist || "ek purana connection";

  const pools = {
    historical_mystery: {
      openLoop: [
        "${evidence} me ek aisi entry thi jiska matlab turant samajh nahi aaya",
        "${trigger} pehle normal laga, lekin wahi sabse bada signal nikla",
        "${tension} ka jawab purane records me chhupa tha",
        "ek purani line ne poori history par sawal khada kar diya"
      ],
      callback: [
        "Aur wahi purani entry aakhir me poori mystery ka center ban gayi.",
        "Jo record pehle ordinary lag raha tha, wahi sabse bada clue nikla.",
        "Jis detail ko ignore kiya gaya tha, usne history ka angle palat diya.",
        "Aakhir me samajh aaya ki purane records kabhi bina wajah repeat nahi hote."
      ]
    },

    true_crime_case: {
      openLoop: [
        "${trigger} investigation ki sabse ignored detail thi",
        "${evidence} normal evidence lag raha tha, lekin usme ek hidden gap tha",
        "${tension} ka jawab case file ke ek chhote point me chhupa tha",
        "ek statement poori timeline se match nahi kar raha tha"
      ],
      callback: [
        "Aur wahi ignored detail aakhir me poori investigation ka direction badal gayi.",
        "Jo evidence normal lag raha tha, wahi case ka turning point nikla.",
        "Jis gap ko chhota maana gaya, wahi sabse bada clue ban gaya.",
        "Aakhir me case wahi se khula jise sabne pehle ignore kiya tha."
      ]
    },

    village_mystery: {
      openLoop: [
        "${trigger} ke baare me gaon wale khulkar baat nahi karte the",
        "${evidence} ko lekar local logon ki khamoshi sabse ajeeb thi",
        "${tension} ka darr gaon me saalon se bana hua tha",
        "gaon ki ek purani baat har kahani me repeat ho rahi thi"
      ],
      callback: [
        "Aur wahi khamoshi aakhir me sabse bada clue ban gayi.",
        "Jo baat gaon wale bol nahi rahe the, wahi poori mystery ka answer nikli.",
        "Jis jagah se log door rehte the, wahi kahani ka asli center nikli.",
        "Aakhir me gaon ki purani afwaah sirf afwaah nahi lagi."
      ]
    },

    money_lesson_case: {
      openLoop: [
        "${trigger} financial decision ka sabse ignored risk tha",
        "${evidence} me warning clear thi, lekin use profit samajh liya gaya",
        "${tension} numbers ke andar chhupa hua tha",
        "ek chhoti calculation ne poori financial story palat di"
      ],
      callback: [
        "Aur wahi ignored risk aakhir me sabse mehngi galti ban gaya.",
        "Jo profit lag raha tha, wahi actual warning nikla.",
        "Jis number ko chhota samjha gaya, usne poora result badal diya.",
        "Aakhir me financial story wahi se palti jahan risk ignore hua tha."
      ]
    },

    general_story: {
      openLoop: [
        "${trigger} pehle normal laga, lekin wahi sabse important detail thi",
        "${evidence} ne kahani me ek hidden gap dikha diya",
        "${tension} ka jawab ek chhoti si detail me chhupa tha",
        "ek ignored clue ne poori story ka angle badal diya"
      ],
      callback: [
        "Aur wahi chhoti detail aakhir me sabse bada clue ban gayi.",
        "Jo baat pehle normal lag rahi thi, wahi kahani ka turning point nikli.",
        "Aakhir me wahi ignored clue poori story ka answer ban gaya.",
        "Jis detail ko side me rakha gaya tha, wahi sab kuch connect kar gayi."
      ]
    }
  };

  const selected = pools[archetype] || pools.general_story;
  const seed = [topic, archetype, trigger, evidence, tension, twist].join("|narrative|");

  const values = { trigger, evidence, tension, twist };

  function apply(template = "") {
    return String(template || "").replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] || "");
  }

  return {
    display_topic: displayTopicForArchetype(topic, archetype),
    open_loop: apply(pickSeeded(selected.openLoop, seed, 13, selected.openLoop[0])),
    callback_line: apply(pickSeeded(selected.callback, seed, 29, selected.callback[0]))
  };
}


function firstResearchFact(researchContext = {}) {
  const facts = Array.isArray(researchContext.facts) ? researchContext.facts : [];
  const first = facts.find(item => item && item.fact);
  return first ? cleanText(first.fact) : "";
}

function firstResearchTimelineEvent(researchContext = {}) {
  const timeline = Array.isArray(researchContext.timeline) ? researchContext.timeline : [];
  const first = timeline.find(item => item && item.event);
  return first ? cleanText(first.event) : "";
}

function researchTimelineStage(researchContext = {}, index = 0) {
  const timeline = Array.isArray(researchContext.timeline) ? researchContext.timeline : [];
  const item = timeline[index] || {};
  return cleanText(item.event || item.label || "");
}

function firstResearchEntity(researchContext = {}) {
  const entities = Array.isArray(researchContext.entities) ? researchContext.entities : [];
  const first = entities.find(item => item && item.name);
  return first ? cleanText(first.name) : "";
}

function firstResearchLocation(researchContext = {}) {
  const locations = Array.isArray(researchContext.locations) ? researchContext.locations : [];
  return cleanText(locations[0] || "");
}


function hasResearchSignals(researchContext = {}) {
  return Boolean(
    cleanText(researchContext.summary || "") ||
    (Array.isArray(researchContext.facts) && researchContext.facts.length) ||
    (Array.isArray(researchContext.timeline) && researchContext.timeline.length) ||
    (Array.isArray(researchContext.entities) && researchContext.entities.length)
  );
}

function shortResearchFact(value = "", topic = "") {
  const clean = cleanText(value);
  const cleanTopic = cleanText(topic);

  if (!clean) return "";

  return clean
    .replace(cleanTopic + " me ", "")
    .replace(cleanTopic + " ka ", "")
    .replace(cleanTopic + " ke liye ", "")
    .replace(/research focus/gi, "focus")
    .replace(/sabse important research angle/gi, "important angle")
    .replace(/verify karna zaroori hai/gi, "verify karna zaroori point")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericLocation(value = "") {
  const lower = cleanText(value).toLowerCase();

  return [
    "railway platform",
    "old house",
    "purani building",
    "ek jagah",
    "market area",
    "village",
    "gaon",
    "unknown place",
    "location"
  ].includes(lower);
}

function topicFallbackLocation(topic = "", researchContext = {}) {
  const cleanTopic = cleanText(topic);
  const type = cleanText(researchContext.research_type || "");

  if (type === "financial_case") return "financial records";
  if (type === "case_investigation") return "case file";
  if (type === "historical_context") return "old records";
  if (type === "local_mystery") return "local area";
  if (type === "fact_explainer") return "main topic";

  return cleanTopic || "main context";
}

function sanitizeResearchAwareContext(baseContext = {}, researchContext = {}) {
  if (!hasResearchSignals(researchContext)) return baseContext;

  const topic = cleanText(baseContext.topic || researchContext.topic || "");
  const cleanFact = shortResearchFact(baseContext.evidence_object, topic);
  const cleanLocation = cleanText(baseContext.location_context);
  const cleanTrigger = cleanText(baseContext.trigger_detail);

  const safeLocation =
    cleanText(firstResearchLocation(researchContext)) ||
    (isGenericLocation(cleanLocation) ? topicFallbackLocation(topic, researchContext) : cleanLocation);

  const safeTrigger =
    isGenericLocation(cleanTrigger)
      ? topicFallbackLocation(topic, researchContext)
      : cleanTrigger;

  const mergedContext = {
    ...baseContext,
    location_context: safeLocation,
    trigger_detail: safeTrigger,
    evidence_object: cleanFact || baseContext.evidence_object,
    research_grounded: true
  };
}


function strictResearchOverride(context = {}, researchContext = {}) {
  if (!hasResearchSignals(researchContext)) return context;

  const topic = cleanText(context.topic || researchContext.topic || "main topic");
  const researchType = cleanText(researchContext.research_type || context.research_type || "");

  const firstFact = shortResearchFact(firstResearchFact(researchContext), topic);
  const firstEntity = firstResearchEntity(researchContext);
  const firstLocation = firstResearchLocation(researchContext);

  const safeByType = {
    case_investigation: {
      location: "case file",
      trigger: "timeline gap",
      tension: "evidence aur statement ka mismatch",
      evidence: "timeline me ignored detail"
    },
    financial_case: {
      location: "financial records",
      trigger: "risk signal",
      tension: "numbers aur decision timing ka mismatch",
      evidence: "transaction detail"
    },
    historical_context: {
      location: "old records",
      trigger: "record gap",
      tension: "popular story aur documented version ka mismatch",
      evidence: "old source detail"
    },
    local_mystery: {
      location: "local area",
      trigger: "repeated local claim",
      tension: "rumor aur proof ka gap",
      evidence: "local witness detail"
    },
    fact_explainer: {
      location: "main topic",
      trigger: "common misconception",
      tension: "belief aur actual reason ka mismatch",
      evidence: "simple example"
    },
    general_research: {
      location: "main context",
      trigger: "key detail",
      tension: "background aur takeaway ka gap",
      evidence: "important context"
    }
  };

  const fallback = safeByType[researchType] || safeByType.general_research;

  const location =
    firstLocation ||
    (isGenericLocation(context.location_context) ? fallback.location : cleanText(context.location_context)) ||
    fallback.location;

  const trigger =
    isGenericLocation(context.trigger_detail) || cleanText(context.trigger_detail).length < 4
      ? fallback.trigger
      : cleanText(context.trigger_detail);

  const evidence =
    firstFact ||
    fallback.evidence;

  const tension =
    cleanText(researchTimelineStage(researchContext, 1)) ||
    fallback.tension;

  return {
    ...context,
    location_context: location,
    trigger_detail: trigger,
    evidence_object: evidence,
    central_tension: tension,
    research_grounded: true
  };
}

function buildResearchAwareContext(baseContext = {}, researchContext = {}) {
  const fact = firstResearchFact(researchContext);
  const timelineEvent = firstResearchTimelineEvent(researchContext);
  const entity = firstResearchEntity(researchContext);
  const location = firstResearchLocation(researchContext);

  const stage1 = researchTimelineStage(researchContext, 0);
  const stage2 = researchTimelineStage(researchContext, 1);
  const stage3 = researchTimelineStage(researchContext, 2);

  return {
    ...baseContext,
    research_context: researchContext,
    research_summary: cleanText(researchContext.summary || ""),
    research_type: cleanText(researchContext.research_type || ""),
    location_context: location || baseContext.location_context,
    trigger_detail: entity || baseContext.trigger_detail,
    evidence_object: fact || baseContext.evidence_object,
    central_tension: timelineEvent || baseContext.central_tension,
    escalation_stage_1: stage1 || baseContext.escalation_stage_1,
    escalation_stage_2: stage2 || baseContext.escalation_stage_2,
    escalation_stage_3: stage3 || baseContext.escalation_stage_3
  };

  return strictResearchOverride(sanitizeResearchAwareContext(mergedContext, researchContext), researchContext);
}

function buildStoryContext(topic = "", channel = {}, researchContext = {}) {
  const cleanTopic = cleanText(topic);
  const mode = channel.contentMode || "story";
  const categories = toList(channel.contentCategories);
  const hookStyles = toList(channel.hookStyles);
  const vocabulary = deriveTopicVocabulary(cleanTopic, channel);
  const archetypeVocabulary = buildArchetypeVocabulary(cleanTopic, channel);
  const escalationStages = buildEscalationStages(cleanTopic, archetypeVocabulary, vocabulary);

  const primaryCategory = pickRanked(categories, cleanTopic, 0, mode);

  const narrativeSignals = buildNarrativeSignals(cleanTopic, archetypeVocabulary, vocabulary);

  const baseContext = {
    topic: cleanTopic,
    display_topic: narrativeSignals.display_topic,
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
    open_loop: narrativeSignals.open_loop,
    callback_line: narrativeSignals.callback_line,
    audience_context: channel.targetAudience || "general audience",
    visual_style: channel.visualStyle || "",
    vocabulary,
    archetype_vocabulary: archetypeVocabulary
  };

  return buildResearchAwareContext(baseContext, researchContext);
}

module.exports = {
  buildStoryContext,
  deriveTopicVocabulary,
  rankTerms
};
