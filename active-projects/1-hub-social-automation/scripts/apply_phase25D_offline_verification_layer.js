const fs = require("fs");
const path = require("path");

const verifierPath = "modules/intelligence/core/offline_verification_engine.js";
const researchPath = "modules/intelligence/core/research_context_builder.js";
const narrativePath = "modules/intelligence/core/research_narrative_engine.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";

const verifierCode = `function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function includesAny(text = "", patterns = []) {
  const lower = cleanText(text).toLowerCase();
  return patterns.some(pattern => lower.includes(pattern));
}

function classifyClaimRisk(text = "", researchType = "") {
  const lower = cleanText(text).toLowerCase();

  let score = 0;
  const reasons = [];

  if (includesAny(lower, ["murder", "killer", "culprit", "suspect", "victim", "crime", "police"])) {
    score += 30;
    reasons.push("crime_or_person_claim");
  }

  if (includesAny(lower, ["fraud", "scam", "loan", "bank", "transaction", "money", "loss"])) {
    score += 24;
    reasons.push("financial_claim");
  }

  if (includesAny(lower, ["prove", "confirmed", "official", "actual culprit", "100%", "guaranteed"])) {
    score += 35;
    reasons.push("certainty_language");
  }

  if (includesAny(lower, ["rumor", "afwaah", "kaha jaata", "local claim", "mystery", "unresolved"])) {
    score += 18;
    reasons.push("unverified_or_disputed_claim");
  }

  if (researchType === "case_investigation") {
    score += 18;
    reasons.push("case_investigation_context");
  }

  if (researchType === "financial_case") {
    score += 16;
    reasons.push("financial_case_context");
  }

  if (researchType === "historical_context" || researchType === "local_mystery") {
    score += 12;
    reasons.push("context_disputed_or_historical");
  }

  const risk_level =
    score >= 70 ? "high" :
    score >= 40 ? "medium" :
    score >= 18 ? "low" :
    "minimal";

  return {
    risk_score: score,
    risk_level,
    reasons
  };
}

function confidenceFromSignals(context = {}) {
  let score = 0.45;
  const reasons = [];

  const facts = toArray(context.facts);
  const timeline = toArray(context.timeline);
  const entities = toArray(context.entities);
  const dates = toArray(context.dates);
  const locations = toArray(context.locations);

  if (facts.length >= 3) {
    score += 0.08;
    reasons.push("multiple_fact_candidates");
  }

  if (timeline.length >= 4) {
    score += 0.1;
    reasons.push("structured_timeline");
  }

  if (entities.length >= 4) {
    score += 0.05;
    reasons.push("entity_context_available");
  }

  if (dates.length) {
    score += 0.06;
    reasons.push("date_signal_available");
  }

  if (locations.length) {
    score += 0.04;
    reasons.push("location_signal_available");
  }

  if (context.generation_mode && String(context.generation_mode).includes("offline")) {
    score -= 0.08;
    reasons.push("offline_inferred_not_source_verified");
  }

  if (context.research_type === "case_investigation" || context.research_type === "financial_case") {
    score -= 0.03;
    reasons.push("sensitive_research_type");
  }

  const confidence_score = Math.max(0.25, Math.min(0.82, Number(score.toFixed(2))));

  return {
    confidence_score,
    confidence_level:
      confidence_score >= 0.72 ? "medium_high" :
      confidence_score >= 0.58 ? "medium" :
      confidence_score >= 0.42 ? "low_medium" :
      "low",
    confidence_reasons: reasons
  };
}

function rewriteUnsafeCertainty(text = "") {
  let value = cleanText(text);

  if (!value) return "";

  value = value
    .replace(/\\bconfirmed fact\\b/gi, "available details ke hisab se")
    .replace(/\\bconfirmed\\b/gi, "available details ke hisab se")
    .replace(/\\bprove kar diya\\b/gi, "is taraf ishara kiya")
    .replace(/\\bproved\\b/gi, "indicated")
    .replace(/\\b100% sach\\b/gi, "strong claim")
    .replace(/\\bactual culprit\\b/gi, "possible responsible person")
    .replace(/\\bculprit wahi tha\\b/gi, "responsibility ka angle us taraf gaya")
    .replace(/\\bofficially true\\b/gi, "officially verify karna zaroori hai")
    .replace(/\\bguaranteed\\b/gi, "possible")
    .replace(/\\bpakka\\b/gi, "possible")
    .replace(/\\s+/g, " ")
    .trim();

  return value;
}

function cautiousPrefixForRisk(riskLevel = "medium", researchType = "") {
  if (riskLevel === "high") {
    return "Available details ke hisab se";
  }

  if (riskLevel === "medium") {
    if (researchType === "financial_case") return "Is type ke financial cases me";
    if (researchType === "case_investigation") return "Investigation-style analysis me";
    return "Available context ke hisab se";
  }

  if (riskLevel === "low") {
    return "Context ke hisab se";
  }

  return "";
}

function applySafeLanguage(text = "", verification = {}) {
  const clean = rewriteUnsafeCertainty(text);
  if (!clean) return "";

  const riskLevel = verification.risk_level || "medium";
  const researchType = verification.research_type || "";

  if (riskLevel === "minimal") return clean;

  const lower = clean.toLowerCase();

  if (
    lower.startsWith("available") ||
    lower.startsWith("is type") ||
    lower.startsWith("context") ||
    lower.startsWith("investigation-style") ||
    lower.startsWith("reports") ||
    lower.startsWith("kuch")
  ) {
    return clean;
  }

  const prefix = cautiousPrefixForRisk(riskLevel, researchType);
  if (!prefix) return clean;

  return prefix + ", " + clean.charAt(0).toLowerCase() + clean.slice(1);
}

function verifyFact(fact = {}, researchType = "") {
  const text = cleanText(fact.fact || fact.text || fact);
  const risk = classifyClaimRisk(text, researchType);

  return {
    ...fact,
    fact: text,
    verification_status: "offline_inferred",
    source_status: "not_source_verified",
    claim_type: risk.risk_level === "high"
      ? "sensitive_inferred_claim"
      : risk.risk_level === "medium"
        ? "inferred_context_claim"
        : "low_risk_context_claim",
    risk_level: risk.risk_level,
    risk_score: risk.risk_score,
    risk_reasons: risk.reasons,
    safe_fact: applySafeLanguage(text, {
      risk_level: risk.risk_level,
      research_type: researchType
    })
  };
}

function buildVerificationProfile(context = {}) {
  const researchType = context.research_type || "general_research";
  const factText = toArray(context.facts).map(item => item.fact || "").join(" ");
  const summaryText = context.summary || "";
  const combined = [context.topic, summaryText, factText].join(" ");

  const risk = classifyClaimRisk(combined, researchType);
  const confidence = confidenceFromSignals(context);

  return {
    verification_status: "offline_inferred",
    source_status: "not_source_verified",
    verification_mode: "offline_guard",
    research_type: researchType,
    confidence_score: confidence.confidence_score,
    confidence_level: confidence.confidence_level,
    confidence_reasons: confidence.confidence_reasons,
    risk_level: risk.risk_level,
    risk_score: risk.risk_score,
    risk_reasons: risk.reasons,
    safe_language_mode: risk.risk_level !== "minimal",
    allowed_claim_style:
      risk.risk_level === "high"
        ? "cautious_only"
        : risk.risk_level === "medium"
          ? "contextual_cautious"
          : "normal_with_no_certainty",
    required_disclaimers: [
      "Do not present inferred points as verified facts",
      "Avoid absolute certainty unless source verification exists",
      "Use cautious framing for crime, fraud, financial and disputed claims"
    ]
  };
}

function applyOfflineVerification(context = {}) {
  const profile = buildVerificationProfile(context);
  const researchType = context.research_type || "general_research";

  const verifiedFacts = toArray(context.facts).map(fact => verifyFact(fact, researchType));

  return {
    ...context,
    verification: profile,
    verification_status: profile.verification_status,
    source_status: profile.source_status,
    confidence_score: profile.confidence_score,
    confidence_level: profile.confidence_level,
    risk_level: profile.risk_level,
    safe_language_mode: profile.safe_language_mode,
    facts: verifiedFacts,
    safe_summary: applySafeLanguage(context.summary || "", profile)
  };
}

module.exports = {
  applyOfflineVerification,
  buildVerificationProfile,
  classifyClaimRisk,
  applySafeLanguage,
  rewriteUnsafeCertainty
};
`;

fs.writeFileSync(verifierPath, verifierCode);

let researchCode = fs.readFileSync(researchPath, "utf8");

if (!researchCode.includes("offline_verification_engine")) {
  researchCode = researchCode.replace(
`function cleanText(value = "") {`,
`const { applyOfflineVerification } = require("./offline_verification_engine");

function cleanText(value = "") {`
  );
}

if (!researchCode.includes("return applyOfflineVerification(normalizeResearchContext(context));")) {
  researchCode = researchCode.replace(
`  return normalizeResearchContext(context);`,
`  return applyOfflineVerification(normalizeResearchContext(context));`
  );
}

fs.writeFileSync(researchPath, researchCode);

let narrativeCode = fs.readFileSync(narrativePath, "utf8");

if (!narrativeCode.includes("function safeBeatLine")) {
  const helper = `
function safeBeatLine(line = "", researchContext = {}) {
  const verification = researchContext.verification || {};
  const safeMode = Boolean(researchContext.safe_language_mode || verification.safe_language_mode);

  if (!safeMode) return cleanText(line);

  let value = cleanText(line)
    .replace(/ye prove karta hai/gi, "ye point indicate karta hai")
    .replace(/confirmed hai/gi, "verify karna zaroori hai")
    .replace(/pakka/gi, "possible")
    .replace(/actual culprit/gi, "possible responsible angle")
    .trim();

  if (!value) return "";

  if (
    /available|context|is type|investigation-style|reports|kuch/i.test(value.slice(0, 35))
  ) {
    return value;
  }

  if (verification.risk_level === "high") {
    return "Available details ke hisab se, " + value.charAt(0).toLowerCase() + value.slice(1);
  }

  if (verification.risk_level === "medium") {
    return "Context ke hisab se, " + value.charAt(0).toLowerCase() + value.slice(1);
  }

  return value;
}
`;

  narrativeCode = narrativeCode.replace(
    "function buildResearchNarrative(topic = \"\", channel = {}, researchContext = {}) {",
    helper + "\nfunction buildResearchNarrative(topic = \"\", channel = {}, researchContext = {}) {"
  );

  narrativeCode = narrativeCode.replace(
`  const beats = buildBeatsFromTimeline(cleanTopic, researchContext, mode);`,
`  const beats = buildBeatsFromTimeline(cleanTopic, researchContext, mode).map(beat => ({
    ...beat,
    line: safeBeatLine(beat.line, researchContext)
  }));`
  );

  narrativeCode = narrativeCode.replace(
`    quality_notes: [
      "Use timeline beats in order",`,
`    verification: researchContext.verification || {},
    safety_profile: {
      verification_status: researchContext.verification_status || "offline_inferred",
      source_status: researchContext.source_status || "not_source_verified",
      confidence_score: researchContext.confidence_score,
      risk_level: researchContext.risk_level,
      safe_language_mode: researchContext.safe_language_mode
    },
    quality_notes: [
      "Use timeline beats in order",`
  );

  narrativeCode = narrativeCode.replace(
`      "Prefer evidence and timeline over random scene vocabulary"`,
`      "Prefer evidence and timeline over random scene vocabulary",
      "Respect offline verification safety profile"`
  );

  fs.writeFileSync(narrativePath, narrativeCode);
}

let realizerCode = fs.readFileSync(realizerPath, "utf8");

if (!realizerCode.includes("function applyStorySafetyGuard")) {
  const helper = `
function applyStorySafetyGuard(blocks = {}, context = {}) {
  const verification =
    context.verification ||
    context.research_context?.verification ||
    context.research_narrative?.verification ||
    {};

  const safeMode = Boolean(
    context.safe_language_mode ||
    context.research_context?.safe_language_mode ||
    context.research_narrative?.safety_profile?.safe_language_mode ||
    verification.safe_language_mode
  );

  if (!safeMode) return blocks;

  function safeLine(value = "") {
    let text = clean(value || "");

    text = text
      .replace(/confirmed hai/gi, "verify karna zaroori hai")
      .replace(/ye prove karta hai/gi, "ye point indicate karta hai")
      .replace(/pakka/gi, "possible")
      .replace(/actual culprit/gi, "possible responsible angle")
      .replace(/100%/g, "strongly")
      .trim();

    return text;
  }

  return Object.fromEntries(
    Object.entries(blocks).map(([key, value]) => [key, safeLine(value)])
  );
}
`;

  realizerCode = realizerCode.replace(
    "function realizeDocumentaryStory(context = {}) {",
    helper + "\nfunction realizeDocumentaryStory(context = {}) {"
  );

  realizerCode = realizerCode.replace(
`  return {
    hook: humanizeDocumentaryBlock(polishedHook, context.topic || ""),
    setup: humanizeDocumentaryBlock(blocks.documentary_setup || "", context.topic || ""),
    conflict: humanizeDocumentaryBlock(blocks.documentary_conflict || "", context.topic || ""),
    clue: humanizeDocumentaryBlock(blocks.documentary_evidence || "", context.topic || ""),
    escalation: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),
    twist: humanizeDocumentaryBlock(polishedTwist || blocks.documentary_turn || "", context.topic || ""),
    callback: clean(context.callback_line || "Aakhir me wahi ignored detail sabse bada clue ban gayi."),
    lesson: customLesson || avoidDuplicatePhrase(blocks.documentary_takeaway || buildEndingFormula(context, context.display_topic || context.topic || "ye kahani"))
  };`,
`  const safeBlocks = applyStorySafetyGuard({
    hook: humanizeDocumentaryBlock(polishedHook, context.topic || ""),
    setup: humanizeDocumentaryBlock(blocks.documentary_setup || "", context.topic || ""),
    conflict: humanizeDocumentaryBlock(blocks.documentary_conflict || "", context.topic || ""),
    clue: humanizeDocumentaryBlock(blocks.documentary_evidence || "", context.topic || ""),
    escalation: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),
    twist: humanizeDocumentaryBlock(polishedTwist || blocks.documentary_turn || "", context.topic || ""),
    callback: clean(context.callback_line || "Aakhir me wahi ignored detail sabse bada clue ban gayi."),
    lesson: customLesson || avoidDuplicatePhrase(blocks.documentary_takeaway || buildEndingFormula(context, context.display_topic || context.topic || "ye kahani"))
  }, context);

  return safeBlocks;`
  );

  fs.writeFileSync(realizerPath, realizerCode);
}

console.log("✅ Phase 25D Offline Verification Layer added");
console.log("✅ Research confidence, risk and safe language integrated");
console.log("✅ Narrative and story realizer safety guards wired");
