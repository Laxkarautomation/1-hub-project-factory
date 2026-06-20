const fs = require("fs");

const contextPath = "modules/intelligence/core/story_context_builder.js";
let code = fs.readFileSync(contextPath, "utf8");

if (!code.includes("function strictResearchOverride")) {
  const helper = `
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
`;

  code = code.replace(
    "function buildResearchAwareContext(baseContext = {}, researchContext = {}) {",
    helper + "\nfunction buildResearchAwareContext(baseContext = {}, researchContext = {}) {"
  );

  code = code.replace(
    "return sanitizeResearchAwareContext(mergedContext, researchContext);",
    "return strictResearchOverride(sanitizeResearchAwareContext(mergedContext, researchContext), researchContext);"
  );

  fs.writeFileSync(contextPath, code);
  console.log("✅ Strict research sanity override added");
} else {
  console.log("ℹ️ Strict research sanity override already exists");
}
