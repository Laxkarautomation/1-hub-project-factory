const fs = require("fs");
const path = require("path");

const narrativePath = "modules/intelligence/core/research_narrative_engine.js";
const briefPath = "modules/intelligence/core/script_brief_builder.js";

const narrativeCode = `function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function pickFirst(items = [], fallback = "") {
  return toArray(items).find(Boolean) || fallback;
}

function firstFact(researchContext = {}) {
  const facts = toArray(researchContext.facts);
  const item = facts.find(fact => fact && fact.fact);
  return cleanText(item ? item.fact : "");
}

function firstEntity(researchContext = {}) {
  const entities = toArray(researchContext.entities);
  const item = entities.find(entity => entity && entity.name);
  return cleanText(item ? item.name : "");
}

function timelineEvents(researchContext = {}) {
  return toArray(researchContext.timeline)
    .map(item => ({
      label: cleanText(item.label || ""),
      event: cleanText(item.event || ""),
      confidence: cleanText(item.confidence || "inferred")
    }))
    .filter(item => item.event || item.label);
}

function compactTopicFact(topic = "", value = "") {
  const cleanTopic = cleanText(topic);
  return cleanText(value)
    .replace(cleanTopic + " me ", "")
    .replace(cleanTopic + " ka ", "")
    .replace(cleanTopic + " ke liye ", "")
    .replace(/primary timeline/gi, "timeline")
    .replace(/sabse important research angle/gi, "important angle")
    .replace(/research focus/gi, "focus")
    .replace(/verify karna zaroori hai/gi, "verify karna zaroori point")
    .replace(/\\s+/g, " ")
    .trim();
}

function inferNarrativeMode(researchContext = {}, channel = {}) {
  const type = cleanText(researchContext.research_type || "");
  const mode = cleanText(channel.contentMode || "");

  if (type === "case_investigation") return "investigation_documentary";
  if (type === "financial_case") return "risk_breakdown";
  if (type === "historical_context") return "record_based_mystery";
  if (type === "local_mystery") return "local_claim_mystery";
  if (type === "fact_explainer") return "misconception_explainer";
  if (mode === "education" || mode === "finance") return "practical_explainer";

  return "story_documentary";
}

function fallbackBeats(topic = "", mode = "story_documentary") {
  const cleanTopic = cleanText(topic || "ye topic");

  const pools = {
    investigation_documentary: [
      { beat: "setup", purpose: "case opening", line: cleanTopic + " me shuruaat ek simple report se hoti hai." },
      { beat: "conflict", purpose: "timeline doubt", line: "Phir timeline aur statements me mismatch dikhna shuru hota hai." },
      { beat: "evidence", purpose: "ignored clue", line: "Ek ignored detail investigation ka direction badal deti hai." },
      { beat: "turn", purpose: "case pressure", line: "Jitni details connect hoti hain, utna case straightforward nahi lagta." },
      { beat: "takeaway", purpose: "lesson", line: "Aise cases me sach aksar chhoti inconsistencies me chhupa hota hai." }
    ],
    risk_breakdown: [
      { beat: "setup", purpose: "decision opening", line: cleanTopic + " ki shuruaat ek normal financial decision se hoti hai." },
      { beat: "conflict", purpose: "risk signal", line: "Numbers pehle safe lagte hain, lekin risk quietly build hota hai." },
      { beat: "evidence", purpose: "document clue", line: "Ek document ya transaction detail warning signal ban jaati hai." },
      { beat: "turn", purpose: "loss reveal", line: "Jab actual calculation hoti hai, expected profit ka angle weak padta hai." },
      { beat: "takeaway", purpose: "financial lesson", line: "Financial decisions me risk ko ignore karna sabse mehngi galti ban sakta hai." }
    ],
    record_based_mystery: [
      { beat: "setup", purpose: "old reference", line: cleanTopic + " ka first layer old records se start hota hai." },
      { beat: "conflict", purpose: "record gap", line: "Popular story aur documented version ek jaise nahi lagte." },
      { beat: "evidence", purpose: "archive clue", line: "Ek old source detail kahani ko naya angle deti hai." },
      { beat: "turn", purpose: "historical doubt", line: "Jab records compare hote hain, purani story incomplete lagne lagti hai." },
      { beat: "takeaway", purpose: "history lesson", line: "History me sabse important clues aksar small entries me chhupe hote hain." }
    ],
    local_claim_mystery: [
      { beat: "setup", purpose: "local opening", line: cleanTopic + " ki kahani local claims se shuru hoti hai." },
      { beat: "conflict", purpose: "silence or rumor", line: "Logon ki repeated baat aur proof gap suspense create karta hai." },
      { beat: "evidence", purpose: "witness clue", line: "Ek local witness detail rumor ko serious bana deti hai." },
      { beat: "turn", purpose: "claim pressure", line: "Jitni baar same claim repeat hota hai, kahani utni suspicious lagti hai." },
      { beat: "takeaway", purpose: "local lesson", line: "Local mysteries me kabhi kabhi silence bhi clue hota hai." }
    ],
    misconception_explainer: [
      { beat: "setup", purpose: "common belief", line: cleanTopic + " ke baare me log ek common belief rakhte hain." },
      { beat: "conflict", purpose: "belief gap", line: "Problem ye hai ki actual reason us belief se different hota hai." },
      { beat: "evidence", purpose: "simple example", line: "Ek simple example is confusion ko clear kar deta hai." },
      { beat: "turn", purpose: "real explanation", line: "Jab context samajh aata hai, topic ka actual meaning change ho jaata hai." },
      { beat: "takeaway", purpose: "clear lesson", line: "Har fact ko samajhne ke liye headline se zyada context important hota hai." }
    ],
    story_documentary: [
      { beat: "setup", purpose: "background", line: cleanTopic + " ki shuruaat ek normal context se hoti hai." },
      { beat: "conflict", purpose: "hidden problem", line: "Phir ek hidden gap kahani ko serious bana deta hai." },
      { beat: "evidence", purpose: "key detail", line: "Ek key detail poori story ka angle change karti hai." },
      { beat: "turn", purpose: "reveal", line: "Jab details connect hoti hain, kahani ka real direction saamne aata hai." },
      { beat: "takeaway", purpose: "lesson", line: "Kabhi kabhi chhoti detail hi poori story ka answer hoti hai." }
    ]
  };

  return pools[mode] || pools.story_documentary;
}

function buildBeatsFromTimeline(topic = "", researchContext = {}, mode = "story_documentary") {
  const events = timelineEvents(researchContext);
  const fallback = fallbackBeats(topic, mode);

  if (!events.length) return fallback;

  const fact = compactTopicFact(topic, firstFact(researchContext));
  const entity = firstEntity(researchContext);
  const cleanTopic = cleanText(topic);

  const mapped = [
    {
      beat: "setup",
      purpose: "opening context",
      line: events[0]?.event || fallback[0].line,
      confidence: events[0]?.confidence || "inferred"
    },
    {
      beat: "conflict",
      purpose: "first contradiction",
      line: events[1]?.event || fallback[1].line,
      confidence: events[1]?.confidence || "inferred"
    },
    {
      beat: "evidence",
      purpose: "proof or clue",
      line: fact || events[2]?.event || fallback[2].line,
      confidence: fact ? "research_fact" : (events[2]?.confidence || "inferred")
    },
    {
      beat: "turn",
      purpose: "story turn",
      line: events[2]?.event || events[3]?.event || fallback[3].line,
      confidence: events[2]?.confidence || events[3]?.confidence || "inferred"
    },
    {
      beat: "takeaway",
      purpose: "audience memory",
      line: entity
        ? cleanTopic + " me " + entity + " se judi detail audience ko yaad rehni chahiye."
        : fallback[4].line,
      confidence: entity ? "entity_derived" : "inferred"
    }
  ];

  return mapped.map((item, index) => ({
    order: index + 1,
    ...item,
    line: cleanText(item.line)
  }));
}

function buildNarrativeFocus(topic = "", researchContext = {}, mode = "story_documentary") {
  const fact = compactTopicFact(topic, firstFact(researchContext));
  const entity = firstEntity(researchContext);
  const events = timelineEvents(researchContext);

  return {
    primary_subject: entity || cleanText(topic),
    main_tension: events[1]?.event || events[0]?.event || "hidden gap",
    strongest_evidence: fact || "key detail",
    reveal_path: events.map(item => item.event).filter(Boolean).slice(0, 4),
    audience_memory: fact || entity || cleanText(topic),
    narrative_mode: mode
  };
}

function buildResearchNarrative(topic = "", channel = {}, researchContext = {}) {
  const cleanTopic = cleanText(topic || researchContext.topic || "research topic");
  const mode = inferNarrativeMode(researchContext, channel);
  const beats = buildBeatsFromTimeline(cleanTopic, researchContext, mode);
  const focus = buildNarrativeFocus(cleanTopic, researchContext, mode);

  return {
    topic: cleanTopic,
    narrative_mode: mode,
    focus,
    beats,
    scene_plan: beats.map(item => item.line),
    quality_notes: [
      "Use timeline beats in order",
      "Do not present inferred beats as verified facts",
      "Keep unresolved claims cautious",
      "Prefer evidence and timeline over random scene vocabulary"
    ]
  };
}

module.exports = {
  buildResearchNarrative,
  inferNarrativeMode,
  buildBeatsFromTimeline
};
`;

fs.writeFileSync(narrativePath, narrativeCode);

let briefCode = fs.readFileSync(briefPath, "utf8");

if (!briefCode.includes("research_narrative_engine")) {
  briefCode = briefCode.replace(
`const { realizeStory } = require("./story_realizer");`,
`const { realizeStory } = require("./story_realizer");
const { buildResearchNarrative } = require("./research_narrative_engine");`
  );
}

if (!briefCode.includes("const researchNarrative = buildResearchNarrative")) {
  briefCode = briefCode.replace(
`    const storyContext = buildStoryContext(topic, channel, researchContext);

    return {`,
`    const storyContext = buildStoryContext(topic, channel, researchContext);
    const researchNarrative = buildResearchNarrative(topic, channel, researchContext);

    return {`
  );

  briefCode = briefCode.replace(
`      research_context: researchContext,
      story_context: storyContext,`,
`      research_context: researchContext,
      research_narrative: researchNarrative,
      story_context: storyContext,`
  );

  briefCode = briefCode.replace(
`      story_skeleton: buildStorySkeleton(topic, channel),
      scene_plan: Object.values(buildStorySkeleton(topic, channel)),`,
`      story_skeleton: buildStorySkeleton(topic, channel),
      scene_plan: researchNarrative.scene_plan && researchNarrative.scene_plan.length
        ? researchNarrative.scene_plan
        : Object.values(buildStorySkeleton(topic, channel)),`
  );
}

fs.writeFileSync(briefPath, briefCode);

console.log("✅ Phase 25B.1 Research Narrative Engine added");
console.log("✅ Phase 25B.2 Research Narrative integrated into script briefs");
