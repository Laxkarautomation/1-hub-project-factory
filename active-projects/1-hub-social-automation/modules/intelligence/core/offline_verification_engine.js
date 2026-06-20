function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
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
    .replace(/\bconfirmed fact\b/gi, "available details ke hisab se")
    .replace(/\bconfirmed\b/gi, "available details ke hisab se")
    .replace(/\bprove kar diya\b/gi, "is taraf ishara kiya")
    .replace(/\bproved\b/gi, "indicated")
    .replace(/\b100% sach\b/gi, "strong claim")
    .replace(/\bactual culprit\b/gi, "possible responsible person")
    .replace(/\bculprit wahi tha\b/gi, "responsibility ka angle us taraf gaya")
    .replace(/\bofficially true\b/gi, "officially verify karna zaroori hai")
    .replace(/\bguaranteed\b/gi, "possible")
    .replace(/\bpakka\b/gi, "possible")
    .replace(/\s+/g, " ")
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
