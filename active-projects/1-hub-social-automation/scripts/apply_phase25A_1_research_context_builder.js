const fs = require("fs");
const path = require("path");

const targetPath = "modules/intelligence/core/research_context_builder.js";

const code = `function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function toList(value = []) {
  if (Array.isArray(value)) {
    return value.map(item => cleanText(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map(item => cleanText(item))
    .filter(Boolean);
}

function unique(items = []) {
  const seen = new Set();
  return items.filter(item => {
    const key = cleanText(item).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tokenize(text = "") {
  return cleanText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\\u0900-\\u097F\\s]/gi, " ")
    .split(/\\s+/)
    .map(item => cleanText(item))
    .filter(Boolean);
}

function titleCase(value = "") {
  return cleanText(value)
    .split(" ")
    .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
}

function extractCapitalizedEntities(topic = "") {
  const cleanTopic = cleanText(topic);
  const chunks = cleanTopic.match(/\\b[A-Z][a-zA-Z0-9]+(?:\\s+[A-Z][a-zA-Z0-9]+)*\\b/g) || [];
  return unique(chunks).filter(item => item.length > 2);
}

function detectDates(topic = "") {
  const text = cleanText(topic);
  const dates = [];

  const yearMatches = text.match(/\\b(18|19|20)\\d{2}\\b/g) || [];
  dates.push(...yearMatches);

  const dateMatches = text.match(/\\b\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-](18|19|20)?\\d{2}\\b/g) || [];
  dates.push(...dateMatches);

  return unique(dates);
}

function detectLocations(topic = "", channel = {}) {
  const text = cleanText(topic);
  const lower = text.toLowerCase();
  const locations = [];

  const channelLocations = toList(channel.targetLocations || channel.locations || channel.geoFocus);
  locations.push(...channelLocations.filter(location => lower.includes(location.toLowerCase())));

  const locationHints = [
    "india",
    "bharat",
    "mumbai",
    "delhi",
    "kolkata",
    "chennai",
    "rajasthan",
    "madhya pradesh",
    "mandsaur",
    "ratlam",
    "neemuch",
    "village",
    "gaon",
    "forest",
    "jungle",
    "mountain",
    "pahad",
    "river",
    "nadi",
    "bank",
    "market",
    "court",
    "police station"
  ];

  locationHints.forEach(location => {
    if (lower.includes(location)) locations.push(titleCase(location));
  });

  return unique(locations);
}

function inferResearchType(topic = "", channel = {}) {
  const text = [topic, channel.niche, channel.contentMode, toList(channel.contentCategories).join(" ")].join(" ").toLowerCase();

  if (/crime|murder|case|police|investigation|missing|death|killer|forensic/.test(text)) {
    return "case_investigation";
  }

  if (/scam|fraud|stock|market|loan|bank|money|finance|business|profit|loss|emi|credit/.test(text)) {
    return "financial_case";
  }

  if (/history|historical|ancient|king|war|empire|record|archive|purana|itihas/.test(text)) {
    return "historical_context";
  }

  if (/village|gaon|local|afwaah|mystery|haunted|forest|temple/.test(text)) {
    return "local_mystery";
  }

  if (/fact|facts|science|why|kaise|explain|education/.test(text)) {
    return "fact_explainer";
  }

  return "general_research";
}

function buildFactCandidates(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const type = inferResearchType(cleanTopic, channel);
  const keywords = unique([
    ...tokenize(cleanTopic).filter(word => word.length > 3),
    ...toList(channel.topicKeywords),
    ...toList(channel.contentPillars)
  ]).slice(0, 12);

  const pools = {
    case_investigation: [
      cleanTopic + " me primary timeline sabse important research angle hai",
      cleanTopic + " se judi statements, evidence aur sequence verify karna zaroori hai",
      cleanTopic + " ka strongest story point ignored clue ya timeline gap ho sakta hai"
    ],
    financial_case: [
      cleanTopic + " me numbers, risk aur decision point sabse important research angle hain",
      cleanTopic + " ka actual lesson tab clear hota hai jab profit aur risk compare kiya jaye",
      cleanTopic + " me document, transaction ya timing detail turning point ban sakti hai"
    ],
    historical_context: [
      cleanTopic + " me old records, dates aur source context verify karna zaroori hai",
      cleanTopic + " ka mystery angle tab strong hota hai jab record aur popular story me gap mile",
      cleanTopic + " me location, timeline aur key people story ko credible banate hain"
    ],
    local_mystery: [
      cleanTopic + " me local memory, repeated claims aur location detail important hain",
      cleanTopic + " ka suspense tab strong hota hai jab logon ki khamoshi ya repeated warning mile",
      cleanTopic + " me rumor aur evidence ke beech ka gap main story driver ho sakta hai"
    ],
    fact_explainer: [
      cleanTopic + " ko explain karne ke liye definition, reason aur example clear hona chahiye",
      cleanTopic + " me misconception break audience retention badha sakta hai",
      cleanTopic + " ka strongest point simple language me surprising fact reveal karna hai"
    ],
    general_research: [
      cleanTopic + " me background, key detail aur takeaway verify karna zaroori hai",
      cleanTopic + " ka strongest story point ek clear before-after change ho sakta hai",
      cleanTopic + " me audience ko context dene ke baad twist ya lesson dena best rahega"
    ]
  };

  return {
    type,
    keywords,
    facts: pools[type] || pools.general_research
  };
}

function buildTimeline(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const dates = detectDates(cleanTopic);
  const type = inferResearchType(cleanTopic, channel);

  if (dates.length) {
    return dates.map((date, index) => ({
      order: index + 1,
      label: date,
      event: cleanTopic + " se judi important timeline detail",
      confidence: "topic-derived"
    }));
  }

  const templates = {
    case_investigation: [
      "Initial incident or report",
      "Evidence or statement contradiction",
      "Ignored clue becomes important",
      "Final reveal or unresolved question"
    ],
    financial_case: [
      "Initial decision or offer",
      "Risk signal appears",
      "Numbers stop matching expectation",
      "Final loss, lesson, or warning"
    ],
    historical_context: [
      "Original event or reference",
      "Record or oral story becomes popular",
      "Contradiction or missing detail appears",
      "Modern interpretation or mystery remains"
    ],
    local_mystery: [
      "Local story begins",
      "Repeated warning or silence develops",
      "A clue or witness detail appears",
      "Mystery gets a new angle"
    ],
    fact_explainer: [
      "Common belief",
      "Hidden reason",
      "Important proof or example",
      "Simple takeaway"
    ],
    general_research: [
      "Background setup",
      "Key development",
      "Important detail",
      "Takeaway"
    ]
  };

  return (templates[type] || templates.general_research).map((event, index) => ({
    order: index + 1,
    label: "stage_" + (index + 1),
    event,
    confidence: "inferred"
  }));
}

function buildEntities(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const entities = [];

  entities.push(...extractCapitalizedEntities(cleanTopic));
  entities.push(...toList(channel.topicKeywords).slice(0, 5));

  const type = inferResearchType(cleanTopic, channel);

  const roleEntities = {
    case_investigation: ["victim", "witness", "investigator", "suspect", "case file"],
    financial_case: ["customer", "investor", "company", "bank", "transaction"],
    historical_context: ["record", "archive", "local source", "historical figure"],
    local_mystery: ["local people", "witness", "village elder", "location"],
    fact_explainer: ["audience", "expert source", "example"],
    general_research: ["main subject", "source", "audience"]
  };

  entities.push(...(roleEntities[type] || roleEntities.general_research));

  return unique(entities).slice(0, 12).map((name, index) => ({
    name,
    role: index === 0 ? "primary_subject" : "supporting_context",
    confidence: index < 3 ? "medium" : "inferred"
  }));
}

function buildResearchQuestions(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const type = inferResearchType(cleanTopic, channel);

  const common = [
    cleanTopic + " me sabse reliable source kya hai?",
    cleanTopic + " ki actual timeline kya thi?",
    cleanTopic + " me kaunsi detail audience ke liye new ya surprising hogi?"
  ];

  const byType = {
    case_investigation: [
      "Investigation me sabse ignored clue kya tha?",
      "Statements aur evidence me kya mismatch tha?"
    ],
    financial_case: [
      "Financial decision me actual risk kya tha?",
      "Numbers me kaunsa point warning sign tha?"
    ],
    historical_context: [
      "Popular story aur historical record me kya difference hai?",
      "Kaunsa old source sabse important hai?"
    ],
    local_mystery: [
      "Local claims me kaunsi baat repeat hoti hai?",
      "Rumor aur evidence me gap kya hai?"
    ],
    fact_explainer: [
      "Audience ka common misconception kya hai?",
      "Is topic ko easiest example se kaise samjhaya ja sakta hai?"
    ],
    general_research: [
      "Main context kya hai?",
      "Best takeaway kya ho sakta hai?"
    ]
  };

  return unique([...(byType[type] || byType.general_research), ...common]);
}

function buildResearchSummary(topic = "", researchType = "general_research") {
  const cleanTopic = cleanText(topic);

  const summaries = {
    case_investigation: cleanTopic + " ke liye research focus timeline, evidence gap, statements aur ignored clue par rehna chahiye.",
    financial_case: cleanTopic + " ke liye research focus numbers, risk signal, decision timing aur final lesson par rehna chahiye.",
    historical_context: cleanTopic + " ke liye research focus dates, old records, source gaps aur popular story vs documented version par rehna chahiye.",
    local_mystery: cleanTopic + " ke liye research focus local claims, repeated warnings, location context aur proof gap par rehna chahiye.",
    fact_explainer: cleanTopic + " ke liye research focus simple explanation, misconception break aur practical example par rehna chahiye.",
    general_research: cleanTopic + " ke liye research focus background, key detail, timeline aur audience takeaway par rehna chahiye."
  };

  return summaries[researchType] || summaries.general_research;
}

function buildResearchContext(topic = "", channel = {}, options = {}) {
  const cleanTopic = cleanText(topic || "research topic");
  const researchType = inferResearchType(cleanTopic, channel);
  const factData = buildFactCandidates(cleanTopic, channel);
  const locations = detectLocations(cleanTopic, channel);
  const dates = detectDates(cleanTopic);

  const context = {
    topic: cleanTopic,
    research_type: researchType,
    summary: buildResearchSummary(cleanTopic, researchType),
    facts: factData.facts.map((fact, index) => ({
      order: index + 1,
      fact,
      confidence: "inferred",
      source_type: "topic_and_channel_context"
    })),
    timeline: buildTimeline(cleanTopic, channel),
    entities: buildEntities(cleanTopic, channel),
    locations,
    dates,
    keywords: factData.keywords,
    research_questions: buildResearchQuestions(cleanTopic, channel),
    source_hints: [
      "official records where available",
      "credible news/report references",
      "publicly verifiable timeline",
      "cross-check controversial claims"
    ],
    safety_notes: [
      "Do not present inferred points as confirmed facts",
      "Avoid naming real accused/persons unless source verified",
      "Use cautious language for unresolved or disputed claims"
    ],
    confidence: dates.length || locations.length ? 0.72 : 0.58,
    generation_mode: options.generationMode || "offline_inferred_foundation"
  };

  return context;
}

module.exports = {
  buildResearchContext,
  inferResearchType,
  buildTimeline,
  buildEntities,
  buildResearchQuestions
};
`;

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, code);

console.log("✅ Phase 25A.1 Research Context Builder Core added");
console.log(targetPath);
