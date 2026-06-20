const fs = require("fs");

const target = "modules/intelligence/core/story_context_builder.js";
let code = fs.readFileSync(target, "utf8");

code = code.replace(
`  const mergedContext = {
    ...baseContext,
    location_context: safeLocation,
    trigger_detail: safeTrigger,
    evidence_object: cleanFact || baseContext.evidence_object,
    research_grounded: true
  };
}`,
`  const mergedContext = {
    ...baseContext,
    location_context: safeLocation,
    trigger_detail: safeTrigger,
    evidence_object: cleanFact || baseContext.evidence_object,
    research_grounded: true
  };

  return mergedContext;
}`
);

const brokenBlock = `  return {
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

  return strictResearchOverride(sanitizeResearchAwareContext(mergedContext, researchContext), researchContext);`;

const fixedBlock = `  const mergedContext = {
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

  return strictResearchOverride(
    sanitizeResearchAwareContext(mergedContext, researchContext),
    researchContext
  );`;

code = code.replace(brokenBlock, fixedBlock);

fs.writeFileSync(target, code);

console.log("✅ Fixed research override execution bug");
