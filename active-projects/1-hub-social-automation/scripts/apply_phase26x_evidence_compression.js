const fs = require("fs");

const target = "modules/intelligence/core/script_generation_v3.js";
let code = fs.readFileSync(target, "utf8");

if (!code.includes("function extractEvidenceFacts")) {
  const insertAfter = `function extractTimelineLines(topic = "", researchContext = {}, researchNarrative = {}) {
  const timeline = toArray(researchContext.timeline)
    .map(item => cleanText(item.event || item.label || ""))
    .filter(Boolean);

  const beatLines = toArray(researchNarrative.beats)
    .map(item => cleanText(item.narration || item.line || ""))
    .filter(Boolean);

  const lines = [...timeline, ...beatLines]
    .filter(line => !/Initial decision or offer|Risk signal appears|Numbers stop matching expectation|Final loss/i.test(line));

  return lines.length ? lines : [
    \`\${normalizeTopic(topic)} ki shuruaat ek normal situation se hoti hai\`,
    "ek warning signal saamne aata hai",
    "details compare karne par mismatch clear hota hai",
    "end me story ek important lesson me badal jaati hai"
  ];
}
`;

  const helper = `function extractEvidenceFacts(researchContext = {}, researchNarrative = {}) {
  const factLines = toArray(researchContext.facts)
    .map(item => cleanText(item.fact || item.text || item.detail || ""))
    .filter(Boolean);

  const evidenceLines = [
    cleanText(researchContext.research_summary || ""),
    cleanText(researchContext.primary_timeline || ""),
    cleanText(researchContext.source_context || ""),
    cleanText(researchNarrative.documentary_evidence || ""),
    cleanText(researchNarrative.evidence_line || "")
  ].filter(Boolean);

  return [...factLines, ...evidenceLines]
    .filter(line => !/^Context ke hisab se/i.test(line))
    .filter(line => !/lesson simple hai/i.test(line))
    .slice(0, 3);
}

function cleanArcLine(value = "") {
  return cleanText(value)
    .replace(/^Context ke hisab se,\\s*/i, "")
    .replace(/^Available details ke hisab se,\\s*/i, "")
    .replace(/^Jo details available hain unke hisaab se,\\s*/i, "")
    .replace(/\\bslowly\\b/gi, "dheere dheere")
    .replace(/\\s+/g, " ")
    .trim();
}

function evidenceSentence(topic = "", facts = [], fallback = "") {
  const cleanTopic = normalizeTopic(topic);
  const picked = facts.find(line => line && line.length > 35 && !/lesson|takeaway/i.test(line));

  if (picked) {
    return sentence(cleanArcLine(picked));
  }

  return sentence(fallback || \`\${cleanTopic} me records aur details compare karne par ek mismatch clear hone lagta hai\`);
}

function compressBeatLine(value = "", beat = "") {
  let line = cleanArcLine(value);

  line = line
    .replace(/Lekin numbers ke andar asli risk chhupa tha\\.\\s*Lekin asli problem yahan shuru hoti hai:?\\s*/i, "Lekin asli problem yahan shuru hoti hai: ")
    .replace(/Ab sawal ye tha ki .*?\\?\\s*/i, "")
    .replace(/Isi calculation ne poori story palat di\\.\\s*/i, "Isi point par story palat gayi. ")
    .replace(/dheere dheere expensive mistake me convert hone laga/gi, "mehngi galti banne laga")
    .replace(/ek ignored detail ko normal maan kar ignore kar diya gaya/gi, "ek ignored detail ko normal maan liya gaya")
    .replace(/warning end me nahi, shuruaat me hi saamne aa chuki thi/gi, "warning shuruaat me hi saamne aa chuki thi");

  if (beat === "context") {
    line = line
      .replace(/numbers, risk aur decision point important angle hain/gi, "numbers aur risk story ka main angle ban gaye")
      .replace(/important angle hain/gi, "main angle ban gaya");
  }

  if (beat === "evidence" && /lesson simple hai/i.test(line)) {
    line = "Records aur numbers compare karne par mismatch clear hone lagta hai";
  }

  return sentence(line);
}
`;

  code = code.replace(insertAfter, insertAfter + "\n" + helper);
}

code = code.replace(
  `  const lines = extractTimelineLines(topic, researchContext, researchNarrative);
  const hook =`,
  `  const lines = extractTimelineLines(topic, researchContext, researchNarrative);
  const facts = extractEvidenceFacts(researchContext, researchNarrative);
  const hook =`
);

code = code.replace(
  `    evidence: sentence(lines[1] && lines[1].length > 35 ? lines[1] : base.evidence),`,
  `    evidence: evidenceSentence(cleanTopic, facts, lines[1] && lines[1].length > 35 ? lines[1] : base.evidence),`
);

code = code.replace(
  `    context: sentence(lines[0] && lines[0].length > 35 ? lines[0] : base.context),`,
  `    context: sentence(cleanArcLine(lines[0] && lines[0].length > 35 ? lines[0] : base.context)),`
);

code = code.replace(
  `    escalation: sentence(lines[2] && lines[2].length > 35 ? lines[2] : base.escalation),`,
  `    escalation: sentence(cleanArcLine(lines[2] && lines[2].length > 35 ? lines[2] : base.escalation)),`
);

code = code.replace(
  `    lesson: sentence(lesson)`,
  `    lesson: sentence(cleanArcLine(lesson))`
);

code = code.replace(
  `    return {
      ...beat,
      narration: sentence(narration)
    };`,
  `    return {
      ...beat,
      narration: compressBeatLine(narration, beat.beat)
    };`
);

code = code.replace(
  `  if (wordCount(joined) <= 95) return beats;`,
  `  if (wordCount(joined) <= 92) return beats;`
);

code = code.replace(
  `  if (words > 100) score -= 10;
  if (words > 115) score -= 20;`,
  `  if (words > 92) score -= 8;
  if (words > 100) score -= 15;
  if (words > 110) score -= 25;`
);

code = code.replace(
  `  const hasRetention = /Lekin|Ab sawal|Isi point|Isi clue|Isi calculation/i.test(text);`,
  `  const hasRetention = /Lekin|Ab sawal|Isi point|Isi clue|Isi calculation|story palat/i.test(text);
  const hasBadContext = /Context ke hisab se/i.test(text);
  const hasEvidenceAsLesson = beats.some(item => item.beat === "evidence" && /lesson simple hai/i.test(item.narration));`
);

code = code.replace(
  `  if (!hasRetention) score -= 10;
  if ((verification.confidence_score || 0) < 0.6) score -= 3;`,
  `  if (!hasRetention) score -= 10;
  if (hasBadContext) score -= 15;
  if (hasEvidenceAsLesson) score -= 20;
  if ((verification.confidence_score || 0) < 0.6) score -= 3;`
);

code = code.replace(
  `    retention_strength: hasRetention ? "good" : "weak",`,
  `    retention_strength: hasRetention ? "good" : "weak",
    has_bad_context_phrase: hasBadContext,
    has_evidence_as_lesson: hasEvidenceAsLesson,`
);

fs.writeFileSync(target, code);
console.log("✅ Phase 26X evidence and compression refinement applied");
