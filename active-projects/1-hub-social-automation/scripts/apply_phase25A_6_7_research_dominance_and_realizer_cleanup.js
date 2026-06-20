const fs = require("fs");

const contextPath = "modules/intelligence/core/story_context_builder.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";

let contextCode = fs.readFileSync(contextPath, "utf8");
let realizerCode = fs.readFileSync(realizerPath, "utf8");

if (!contextCode.includes("function hasResearchSignals")) {
  const helper = `
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
    .replace(/\\s+/g, " ")
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

  return {
    ...baseContext,
    location_context: safeLocation,
    trigger_detail: safeTrigger,
    evidence_object: cleanFact || baseContext.evidence_object,
    research_grounded: true
  };
}
`;

  contextCode = contextCode.replace(
    "function buildResearchAwareContext(baseContext = {}, researchContext = {}) {",
    helper + "\nfunction buildResearchAwareContext(baseContext = {}, researchContext = {}) {"
  );

  contextCode = contextCode.replace(
`  return {
    ...baseContext,`,
`  const mergedContext = {
    ...baseContext,`
  );

  contextCode = contextCode.replace(
`    escalation_stage_3: stage3 || baseContext.escalation_stage_3
  };
}`,
`    escalation_stage_3: stage3 || baseContext.escalation_stage_3
  };

  return sanitizeResearchAwareContext(mergedContext, researchContext);
}`
  );

  fs.writeFileSync(contextPath, contextCode);
  console.log("✅ Phase 25A.6 research dominance guard added");
} else {
  console.log("ℹ️ Phase 25A.6 already exists");
}

if (!realizerCode.includes("function cleanForNarration")) {
  const helper = `
function cleanForNarration(value = "") {
  return String(value || "")
    .replace(/\\s+/g, " ")
    .replace(/\\s+\\./g, ".")
    .replace(/\\.\\.+/g, ".")
    .replace(/\\.\\.\\./g, "...")
    .trim();
}

function compactEvidence(value = "", topic = "") {
  const cleanValue = cleanForNarration(value);
  const cleanTopic = cleanForNarration(topic);

  if (!cleanValue) return "";

  return cleanValue
    .replace(cleanTopic + " me ", "")
    .replace(cleanTopic + " ka ", "")
    .replace(cleanTopic + " ke liye ", "")
    .replace(/primary timeline/gi, "timeline")
    .replace(/sabse important/gi, "important")
    .replace(/research angle/gi, "angle")
    .replace(/source context/gi, "source detail")
    .trim();
}

function researchIntroLine(context = {}, displayTopic = "") {
  if (!context.research_grounded) return "";

  const type = clean(context.research_type || "");
  const summary = clean(context.research_summary || "");

  if (type === "case_investigation") {
    return \`\${displayTopic} me sabse pehle timeline aur evidence gap ko dekhna padta hai.\`;
  }

  if (type === "financial_case") {
    return \`\${displayTopic} me asli kahani numbers, risk aur timing ke beech chhupi hoti hai.\`;
  }

  if (type === "historical_context") {
    return \`\${displayTopic} me popular story se zyada important old records aur dates ban jaate hain.\`;
  }

  if (type === "local_mystery") {
    return \`\${displayTopic} me local claims aur proof gap story ko suspicious banate hain.\`;
  }

  if (type === "fact_explainer") {
    return \`\${displayTopic} ko samajhne ke liye pehle common misconception todna zaroori hai.\`;
  }

  if (summary) return summary;

  return "";
}

function avoidDuplicatePhrase(text = "") {
  return cleanForNarration(text)
    .replace(/ye case ye yaad dilata hai/gi, "ye case yaad dilata hai")
    .replace(/ye kahani ye yaad dilati hai/gi, "ye kahani yaad dilati hai")
    .replace(/ye story ye batati hai/gi, "ye story batati hai")
    .replace(/hume ye yaad dilata hai ki/gi, "hume yaad dilata hai ki")
    .replace(/hume ye yaad dilati hai ki/gi, "hume yaad dilati hai ki");
}
`;

  realizerCode = realizerCode.replace(
    "function buildHookFormula(context = {}, topic = \"\") {",
    helper + "\nfunction buildHookFormula(context = {}, topic = \"\") {"
  );

  realizerCode = realizerCode.replace(
`  const evidence = clean(context.evidence_object || "ek purana record");`,
`  const evidence = compactEvidence(context.evidence_object || "ek purana record", topic);`
  );

  realizerCode = realizerCode.replace(
`  return {
    hook: openLoop`,
`  const introLine = researchIntroLine(context, displayTopic);

  const realized = {
    hook: openLoop`
  );

  realizerCode = realizerCode.replace(
`    setup: applySceneTemplate(sceneTemplates.setup, sceneValues),`,
`    setup: cleanForNarration([introLine, applySceneTemplate(sceneTemplates.setup, sceneValues)].filter(Boolean).join(" ")),`
  );

  realizerCode = realizerCode.replace(
`    lesson: buildEndingFormula(context, displayTopic)
  };
}`,
`    lesson: avoidDuplicatePhrase(buildEndingFormula(context, displayTopic))
  };

  return realized;
}`
  );

  fs.writeFileSync(realizerPath, realizerCode);
  console.log("✅ Phase 25A.7 research-aware realizer cleanup added");
} else {
  console.log("ℹ️ Phase 25A.7 already exists");
}
