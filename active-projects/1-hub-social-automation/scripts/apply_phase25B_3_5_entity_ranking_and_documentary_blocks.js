const fs = require("fs");

const researchPath = "modules/intelligence/core/research_context_builder.js";
const narrativePath = "modules/intelligence/core/research_narrative_engine.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";
const briefPath = "modules/intelligence/core/script_brief_builder.js";

let researchCode = fs.readFileSync(researchPath, "utf8");
let narrativeCode = fs.readFileSync(narrativePath, "utf8");
let realizerCode = fs.readFileSync(realizerPath, "utf8");
let briefCode = fs.readFileSync(briefPath, "utf8");

if (!researchCode.includes("function isGenericResearchEntity")) {
  const helper = `
function isGenericResearchEntity(value = "") {
  const lower = cleanText(value).toLowerCase();

  return [
    "village",
    "gaon",
    "missing",
    "crime",
    "mystery",
    "incident",
    "victim",
    "witness",
    "investigator",
    "suspect",
    "case file",
    "customer",
    "investor",
    "company",
    "bank",
    "transaction",
    "record",
    "archive",
    "local source",
    "historical figure",
    "local people",
    "village elder",
    "location",
    "audience",
    "expert source",
    "example",
    "main subject",
    "source"
  ].includes(lower);
}

function buildRankedEntity(name = "", topic = "", index = 0, source = "inferred") {
  const cleanName = cleanText(name);
  const cleanTopic = cleanText(topic);
  const lowerName = cleanName.toLowerCase();
  const lowerTopic = cleanTopic.toLowerCase();

  let score = 20;

  if (lowerName === lowerTopic) score += 100;
  if (lowerTopic.includes(lowerName) && cleanName.length > 3) score += 25;
  if (lowerName.includes(lowerTopic) && cleanTopic.length > 3) score += 25;
  if (source === "topic") score += 60;
  if (source === "capitalized_topic") score += 35;
  if (source === "channel_keyword") score += 10;
  if (source === "role") score -= 20;
  if (isGenericResearchEntity(cleanName)) score -= 35;
  if (cleanName.length < 4) score -= 10;

  return {
    name: cleanName,
    role: lowerName === lowerTopic || source === "topic"
      ? "primary_subject"
      : "supporting_context",
    confidence: score >= 80 ? "high" : score >= 40 ? "medium" : "inferred",
    source,
    score
  };
}

function rankResearchEntities(topic = "", candidates = []) {
  const cleanTopic = cleanText(topic);

  return unique([cleanTopic, ...candidates])
    .map((name, index) => {
      let source = "inferred";

      if (cleanText(name).toLowerCase() === cleanTopic.toLowerCase()) source = "topic";
      else if (/^[A-Z]/.test(cleanText(name))) source = "capitalized_topic";
      else if (isGenericResearchEntity(name)) source = "role";

      return buildRankedEntity(name, cleanTopic, index, source);
    })
    .filter(item => item.name)
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
    .slice(0, 12)
    .map((item, index) => ({
      ...item,
      role: index === 0 ? "primary_subject" : "supporting_context"
    }));
}

function normalizeResearchContext(context = {}) {
  const topic = cleanText(context.topic || "");
  const rankedEntities = rankResearchEntities(topic, (context.entities || []).map(item => item.name || item));

  return {
    ...context,
    primary_subject: rankedEntities[0]?.name || topic,
    entities: rankedEntities,
    entity_quality: {
      primary_subject: rankedEntities[0]?.name || topic,
      generic_entities_demoted: rankedEntities.filter(item => isGenericResearchEntity(item.name)).length,
      ranking_version: "25B.3"
    }
  };
}
`;

  researchCode = researchCode.replace(
    "function buildEntities(topic = \"\", channel = {}) {",
    helper + "\nfunction buildEntities(topic = \"\", channel = {}) {"
  );

  const oldBuildEntities = `function buildEntities(topic = "", channel = {}) {
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
}`;

  const newBuildEntities = `function buildEntities(topic = "", channel = {}) {
  const cleanTopic = cleanText(topic);
  const entities = [];

  entities.push(cleanTopic);
  entities.push(...extractCapitalizedEntities(cleanTopic));
  entities.push(...toList(channel.topicKeywords).slice(0, 5));

  const type = inferResearchType(cleanTopic, channel);

  const roleEntities = {
    case_investigation: ["timeline gap", "evidence mismatch", "case file", "ignored clue"],
    financial_case: ["risk signal", "financial records", "transaction detail", "decision timing"],
    historical_context: ["old records", "archive gap", "documented version", "source detail"],
    local_mystery: ["local claim", "proof gap", "local witness detail", "repeated warning"],
    fact_explainer: ["common misconception", "actual reason", "simple example"],
    general_research: ["key detail", "main context", "source"]
  };

  entities.push(...(roleEntities[type] || roleEntities.general_research));

  return rankResearchEntities(cleanTopic, entities);
}`;

  researchCode = researchCode.replace(oldBuildEntities, newBuildEntities);

  researchCode = researchCode.replace(
`  return context;
}

module.exports = {`,
`  return normalizeResearchContext(context);
}

module.exports = {`
  );

  fs.writeFileSync(researchPath, researchCode);
  console.log("✅ Phase 25B.3 Entity ranking added to research context builder");
} else {
  console.log("ℹ️ Phase 25B.3 already exists");
}

if (!narrativeCode.includes("function bestResearchEntity")) {
  const helper = `
function isGenericNarrativeEntity(value = "") {
  const lower = cleanText(value).toLowerCase();

  return [
    "village",
    "gaon",
    "missing",
    "crime",
    "mystery",
    "incident",
    "victim",
    "witness",
    "investigator",
    "suspect",
    "customer",
    "investor",
    "company",
    "bank",
    "transaction",
    "record",
    "archive",
    "audience",
    "source",
    "location"
  ].includes(lower);
}

function bestResearchEntity(researchContext = {}, topic = "") {
  const cleanTopic = cleanText(topic || researchContext.topic || "");
  const primary = cleanText(researchContext.primary_subject || "");

  if (primary && !isGenericNarrativeEntity(primary)) return primary;
  if (cleanTopic) return cleanTopic;

  const entities = toArray(researchContext.entities)
    .filter(item => item && item.name)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const strong = entities.find(item => !isGenericNarrativeEntity(item.name));
  return cleanText(strong?.name || entities[0]?.name || cleanTopic || "main subject");
}

function convertBeatToNarration(topic = "", beat = {}, mode = "story_documentary") {
  const line = cleanText(beat.line || "");
  const cleanTopic = cleanText(topic || "ye topic");

  if (!line) return "";

  if (/^Initial incident or report$/i.test(line)) {
    if (mode === "investigation_documentary") return cleanTopic + " me shuruaat ek simple report se hoti hai.";
    return cleanTopic + " ki shuruaat ek normal situation se hoti hai.";
  }

  if (/^Evidence or statement contradiction$/i.test(line)) {
    return "Phir evidence aur statement ke beech mismatch dikhna shuru hota hai.";
  }

  if (/^Ignored clue becomes important$/i.test(line)) {
    return "Ek ignored clue dheere dheere poori story ka center banne lagta hai.";
  }

  if (/^Final reveal or unresolved question$/i.test(line)) {
    return "End tak case ek reveal ya unresolved question ke point par pahunchta hai.";
  }

  if (/^Initial decision or offer$/i.test(line)) {
    return cleanTopic + " me shuruaat ek normal offer ya decision se hoti hai.";
  }

  if (/^Risk signal appears$/i.test(line)) {
    return "Phir ek risk signal saamne aata hai jise pehle ignore kiya jaata hai.";
  }

  if (/^Numbers stop matching expectation$/i.test(line)) {
    return "Baad me numbers expectation se match karna band kar dete hain.";
  }

  if (/^Final loss, lesson, or warning$/i.test(line)) {
    return "End me ye story loss, lesson ya warning me convert ho jaati hai.";
  }

  return line;
}

function buildDocumentaryBlocks(topic = "", researchNarrative = {}) {
  const cleanTopic = cleanText(topic || researchNarrative.topic || "ye topic");
  const mode = cleanText(researchNarrative.narrative_mode || "story_documentary");
  const beats = toArray(researchNarrative.beats);

  const normalized = beats.map(beat => ({
    ...beat,
    narration: convertBeatToNarration(cleanTopic, beat, mode)
  }));

  const byBeat = {};
  normalized.forEach(item => {
    byBeat[item.beat] = item.narration;
  });

  return {
    documentary_hook:
      mode === "investigation_documentary"
        ? cleanTopic + " me ek timeline gap poori story ka direction badal deta hai..."
        : mode === "risk_breakdown"
          ? cleanTopic + " me ek small risk signal sabse bada warning point ban jaata hai..."
          : cleanTopic + " me ek detail poori kahani ka angle badal deti hai...",
    documentary_setup: byBeat.setup || cleanTopic + " ki shuruaat ek normal context se hoti hai.",
    documentary_conflict: byBeat.conflict || "Phir ek hidden mismatch story ko serious bana deta hai.",
    documentary_evidence: byBeat.evidence || "Ek important detail poori direction badal deti hai.",
    documentary_turn: byBeat.turn || "Jab details connect hoti hain, kahani ka real angle saamne aata hai.",
    documentary_takeaway: byBeat.takeaway || "Aakhir me chhoti detail hi sabse important point ban jaati hai."
  };
}
`;

  narrativeCode = narrativeCode.replace(
    "function firstEntity(researchContext = {}) {",
    helper + "\nfunction firstEntity(researchContext = {}) {"
  );

  narrativeCode = narrativeCode.replace(
`  const entity = firstEntity(researchContext);`,
`  const entity = bestResearchEntity(researchContext, topic);`
  );

  narrativeCode = narrativeCode.replace(
`  const entity = firstEntity(researchContext);`,
`  const entity = bestResearchEntity(researchContext, topic);`
  );

  narrativeCode = narrativeCode.replace(
`  return {
    topic: cleanTopic,
    narrative_mode: mode,
    focus,
    beats,
    scene_plan: beats.map(item => item.line),
    quality_notes: [`,
`  const documentary_blocks = buildDocumentaryBlocks(cleanTopic, { narrative_mode: mode, beats });

  return {
    topic: cleanTopic,
    narrative_mode: mode,
    focus,
    beats,
    documentary_blocks,
    scene_plan: beats.map(item => convertBeatToNarration(cleanTopic, item, mode)),
    quality_notes: [`
  );

  narrativeCode = narrativeCode.replace(
`  buildResearchNarrative,
  inferNarrativeMode,
  buildBeatsFromTimeline`,
`  buildResearchNarrative,
  inferNarrativeMode,
  buildBeatsFromTimeline,
  buildDocumentaryBlocks,
  bestResearchEntity`
  );

  fs.writeFileSync(narrativePath, narrativeCode);
  console.log("✅ Phase 25B.4 Documentary blocks added to research narrative engine");
} else {
  console.log("ℹ️ Phase 25B.4 already exists");
}

if (!realizerCode.includes("function realizeDocumentaryStory")) {
  const helper = `
function realizeDocumentaryStory(context = {}) {
  const narrative = context.research_narrative || {};
  const blocks = narrative.documentary_blocks || {};

  if (!blocks.documentary_setup) return null;

  return {
    hook: blocks.documentary_hook || "",
    setup: blocks.documentary_setup || "",
    conflict: blocks.documentary_conflict || "",
    clue: blocks.documentary_evidence || "",
    escalation: blocks.documentary_turn || "",
    twist: blocks.documentary_turn || "",
    callback: clean(context.callback_line || "Aakhir me wahi ignored detail sabse bada clue ban gayi."),
    lesson: avoidDuplicatePhrase(blocks.documentary_takeaway || buildEndingFormula(context, context.display_topic || context.topic || "ye kahani"))
  };
}
`;

  realizerCode = realizerCode.replace(
    "function realizeStory(context = {}) {",
    helper + "\nfunction realizeStory(context = {}) {"
  );

  realizerCode = realizerCode.replace(
`function realizeStory(context = {}) {
  const topic = topicTitle(context.topic || "story");`,
`function realizeStory(context = {}) {
  const documentaryStory = realizeDocumentaryStory(context);
  if (documentaryStory) return documentaryStory;

  const topic = topicTitle(context.topic || "story");`
  );

  fs.writeFileSync(realizerPath, realizerCode);
  console.log("✅ Phase 25B.5 Narrative Realizer V2 documentary mode added");
} else {
  console.log("ℹ️ Phase 25B.5 already exists");
}

if (!briefCode.includes("research_narrative: researchNarrative")) {
  console.log("ℹ️ Brief builder already checked manually, no required change");
}

if (!briefCode.includes("research_narrative: researchNarrative")) {
  throw new Error("Brief builder missing research_narrative integration. Run Phase 25B.1 first.");
}

if (!briefCode.includes("const storyContextWithNarrative")) {
  briefCode = briefCode.replace(
`    const storyContext = buildStoryContext(topic, channel, researchContext);
    const researchNarrative = buildResearchNarrative(topic, channel, researchContext);

    return {`,
`    const storyContext = buildStoryContext(topic, channel, researchContext);
    const researchNarrative = buildResearchNarrative(topic, channel, researchContext);
    const storyContextWithNarrative = {
      ...storyContext,
      research_narrative: researchNarrative
    };

    return {`
  );

  briefCode = briefCode.replace(
`      story_context: storyContext,
      story_blocks: realizeStory(storyContext),`,
`      story_context: storyContextWithNarrative,
      story_blocks: realizeStory(storyContextWithNarrative),`
  );

  fs.writeFileSync(briefPath, briefCode);
  console.log("✅ Brief story context now carries research narrative into realizer");
} else {
  console.log("ℹ️ Brief context narrative bridge already exists");
}
