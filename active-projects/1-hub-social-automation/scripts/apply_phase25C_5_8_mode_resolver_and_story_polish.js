const fs = require("fs");

const researchPath = "modules/intelligence/core/research_context_builder.js";
const narrativePath = "modules/intelligence/core/research_narrative_engine.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";

let researchCode = fs.readFileSync(researchPath, "utf8");
let narrativeCode = fs.readFileSync(narrativePath, "utf8");
let realizerCode = fs.readFileSync(realizerPath, "utf8");

if (!researchCode.includes("function inferResearchTypeByScore")) {
  const helper = `
function inferResearchTypeByScore(topic = "", channel = {}) {
  const text = [
    topic,
    channel.niche,
    channel.contentMode,
    toList(channel.contentCategories).join(" "),
    toList(channel.topicKeywords).join(" "),
    toList(channel.contentPillars).join(" ")
  ].join(" ").toLowerCase();

  const scores = {
    case_investigation: 0,
    financial_case: 0,
    historical_context: 0,
    local_mystery: 0,
    fact_explainer: 0,
    general_research: 1
  };

  const add = (type, amount, pattern) => {
    if (pattern.test(text)) scores[type] += amount;
  };

  add("case_investigation", 9, /crime|murder|case|police|investigation|missing|death|killer|forensic|betrayal|evidence|statement|victim|suspect|clue/);
  add("financial_case", 8, /scam|fraud|stock|market|loan|bank|money|finance|business|profit|loss|emi|credit|transaction|risk|investor/);
  add("historical_context", 7, /history|historical|ancient|king|war|empire|record|archive|purana|itihas|old records/);
  add("local_mystery", 5, /village|gaon|local|afwaah|haunted|forest|temple|repeated warning/);
  add("fact_explainer", 6, /fact|facts|science|why|kaise|explain|education|misconception/);

  if (/fraud|scam|loan|bank|transaction|money|finance|risk/.test(text)) {
    scores.financial_case += 4;
  }

  if (/story|documentary|real_story|true_crime|real incidents|unsolved/.test(text)) {
    scores.case_investigation += 3;
  }

  if (/loan fraud|bank fraud|financial scam|money scam/.test(text)) {
    scores.financial_case += 6;
    scores.case_investigation += 4;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}
`;

  researchCode = researchCode.replace(
    "function inferResearchType(topic = \"\", channel = {}) {",
    helper + "\nfunction inferResearchType(topic = \"\", channel = {}) {"
  );

  researchCode = researchCode.replace(
`function inferResearchType(topic = "", channel = {}) {
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
}`,
`function inferResearchType(topic = "", channel = {}) {
  return inferResearchTypeByScore(topic, channel);
}`
  );

  fs.writeFileSync(researchPath, researchCode);
  console.log("✅ Phase 25C.5 scored research type resolver added");
} else {
  console.log("ℹ️ Phase 25C.5 already exists");
}

if (!narrativeCode.includes("function resolveNarrativeModeBySignals")) {
  const helper = `
function resolveNarrativeModeBySignals(topic = "", researchContext = {}, channel = {}) {
  const cleanType = cleanText(researchContext.research_type || "");
  const cleanTopic = cleanText(topic || researchContext.topic || "").toLowerCase();
  const text = [
    cleanTopic,
    cleanType,
    cleanText(channel.contentMode || ""),
    cleanText(channel.niche || "")
  ].join(" ").toLowerCase();

  if (cleanType === "financial_case") return "risk_breakdown";
  if (cleanType === "case_investigation") return "investigation_documentary";
  if (cleanType === "historical_context") return "record_based_mystery";
  if (cleanType === "local_mystery") return "local_claim_mystery";
  if (cleanType === "fact_explainer") return "misconception_explainer";

  if (/loan fraud|bank fraud|scam|money|transaction|risk|finance/.test(text)) return "risk_breakdown";
  if (/case|crime|investigation|murder|missing|evidence|statement/.test(text)) return "investigation_documentary";
  if (/history|record|archive|old/.test(text)) return "record_based_mystery";

  return "story_documentary";
}

function humanBeatTakeaway(topic = "", mode = "story_documentary") {
  const cleanTopic = cleanText(topic || "is story");

  if (mode === "investigation_documentary") {
    return "Investigation me sabse chhoti inconsistency bhi poori case file ka direction badal sakti hai.";
  }

  if (mode === "risk_breakdown") {
    return "Is case ka lesson simple hai: financial decision me risk signal ko kabhi ignore nahi karna chahiye.";
  }

  if (mode === "record_based_mystery") {
    return "Is story ka sabse bada point ye hai ki purane records aksar popular kahani se zyada sach bolte hain.";
  }

  if (mode === "local_claim_mystery") {
    return "Local stories me repeated claims aur silence dono important clues ban sakte hain.";
  }

  if (mode === "misconception_explainer") {
    return "Is topic ko samajhne ke liye headline nahi, context dekhna zaroori hai.";
  }

  return cleanTopic + " ki sabse important detail audience ko yaad rehni chahiye.";
}
`;

  narrativeCode = narrativeCode.replace(
    "function inferNarrativeMode(researchContext = {}, channel = {}) {",
    helper + "\nfunction inferNarrativeMode(researchContext = {}, channel = {}) {"
  );

  narrativeCode = narrativeCode.replace(
`function inferNarrativeMode(researchContext = {}, channel = {}) {
  const type = cleanText(researchContext.research_type || "");
  const mode = cleanText(channel.contentMode || "");

  if (type === "case_investigation") return "investigation_documentary";
  if (type === "financial_case") return "risk_breakdown";
  if (type === "historical_context") return "record_based_mystery";
  if (type === "local_mystery") return "local_claim_mystery";
  if (type === "fact_explainer") return "misconception_explainer";
  if (mode === "education" || mode === "finance") return "practical_explainer";

  return "story_documentary";
}`,
`function inferNarrativeMode(researchContext = {}, channel = {}) {
  return resolveNarrativeModeBySignals(researchContext.topic || "", researchContext, channel);
}`
  );

  narrativeCode = narrativeCode.replace(
`      line: entity
        ? cleanTopic + " me " + entity + " se judi detail audience ko yaad rehni chahiye."
        : fallback[4].line,`,
`      line: humanBeatTakeaway(cleanTopic, mode),`
  );

  narrativeCode = narrativeCode.replace(
`    primary_subject: entity || cleanText(topic),`,
`    primary_subject: bestResearchEntity(researchContext, topic),`
  );

  fs.writeFileSync(narrativePath, narrativeCode);
  console.log("✅ Phase 25C.6 narrative mode resolver and takeaway polish added");
} else {
  console.log("ℹ️ Phase 25C.6 already exists");
}

if (!realizerCode.includes("function splitRepeatedTwist")) {
  const helper = `
function splitRepeatedTwist(blocks = {}) {
  const escalation = clean(blocks.documentary_turn || "");
  const evidence = clean(blocks.documentary_evidence || "");
  const conflict = clean(blocks.documentary_conflict || "");

  if (!escalation) return "";

  if (escalation === evidence || escalation === conflict) {
    return "Jab ye details ek saath dekhi gayi, kahani ka asli angle aur clear hone laga.";
  }

  if (/ignored clue/i.test(escalation)) {
    return "Yahin se story simple incident se serious investigation me badal gayi.";
  }

  return escalation;
}

function buildPolishedHook(topic = "", narrative = {}, blocks = {}) {
  const cleanTopic = clean(topic || "ye story");
  const mode = narrative.narrative_mode || "";

  if (mode === "investigation_documentary") {
    return cleanTopic + " me ek chhota timeline gap poori investigation ka direction badal deta hai...";
  }

  if (mode === "risk_breakdown") {
    return cleanTopic + " me ek ignored risk signal sabse badi warning ban gaya...";
  }

  if (mode === "record_based_mystery") {
    return cleanTopic + " me ek old record ne popular story par sawal khada kar diya...";
  }

  return blocks.documentary_hook || cleanTopic + " me ek detail poori kahani ka angle badal deti hai...";
}
`;

  realizerCode = realizerCode.replace(
    "function realizeDocumentaryStory(context = {}) {",
    helper + "\nfunction realizeDocumentaryStory(context = {}) {"
  );

  realizerCode = realizerCode.replace(
`  const customLesson = buildHumanLesson(
    context.topic || "",
    narrative
  );

  return {
    hook: humanizeDocumentaryBlock(blocks.documentary_hook || "", context.topic || ""),`,
`  const customLesson = buildHumanLesson(
    context.topic || "",
    narrative
  );

  const polishedHook = buildPolishedHook(context.topic || "", narrative, blocks);
  const polishedTwist = splitRepeatedTwist(blocks);

  return {
    hook: humanizeDocumentaryBlock(polishedHook, context.topic || ""),`
  );

  realizerCode = realizerCode.replace(
`    escalation: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),
    twist: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),`,
`    escalation: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),
    twist: humanizeDocumentaryBlock(polishedTwist || blocks.documentary_turn || "", context.topic || ""),`
  );

  fs.writeFileSync(realizerPath, realizerCode);
  console.log("✅ Phase 25C.7 hook and twist polish added");
} else {
  console.log("ℹ️ Phase 25C.7 already exists");
}

