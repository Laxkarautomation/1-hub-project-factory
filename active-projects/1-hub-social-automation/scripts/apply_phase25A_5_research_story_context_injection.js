const fs = require("fs");

const contextPath = "modules/intelligence/core/story_context_builder.js";
const briefPath = "modules/intelligence/core/script_brief_builder.js";

let contextCode = fs.readFileSync(contextPath, "utf8");
let briefCode = fs.readFileSync(briefPath, "utf8");

if (!contextCode.includes("function firstResearchFact")) {
  const helper = `
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
}
`;

  contextCode = contextCode.replace(
    "function buildStoryContext(topic = \"\", channel = {}) {",
    helper + "\nfunction buildStoryContext(topic = \"\", channel = {}, researchContext = {}) {"
  );

  contextCode = contextCode.replace(
    "  return {\n    topic: cleanTopic,",
    "  const baseContext = {\n    topic: cleanTopic,"
  );

  contextCode = contextCode.replace(
    "    archetype_vocabulary: archetypeVocabulary\n  };\n}",
    "    archetype_vocabulary: archetypeVocabulary\n  };\n\n  return buildResearchAwareContext(baseContext, researchContext);\n}"
  );

  fs.writeFileSync(contextPath, contextCode);
  console.log("✅ Research-aware story context added");
} else {
  console.log("ℹ️ Research-aware story context already exists");
}

if (!briefCode.includes("const storyContext = buildStoryContext(topic, channel, researchContext);")) {
  briefCode = briefCode.replace(
`    const topic = item.topic;
    const formula = strategyFormulas[0] || item.suggested_formula;

    return {`,
`    const topic = item.topic;
    const formula = strategyFormulas[0] || item.suggested_formula;
    const storyContext = buildStoryContext(topic, channel, researchContext);

    return {`
  );

  briefCode = briefCode.replace(
`      story_context: buildStoryContext(topic, channel),
      story_blocks: realizeStory(buildStoryContext(topic, channel)),`,
`      story_context: storyContext,
      story_blocks: realizeStory(storyContext),`
  );

  fs.writeFileSync(briefPath, briefCode);
  console.log("✅ Script briefs now pass research context into story context");
} else {
  console.log("ℹ️ Brief integration already passes research context");
}
