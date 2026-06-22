function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.{4,}/g, "...")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function sentence(value = "", fallback = "") {
  const text = cleanText(value || fallback);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : text + ".";
}

function wordCount(text = "") {
  return cleanText(text).split(/\s+/).filter(Boolean).length;
}

function hasContextLead(value = "") {
  return /^(Context ke hisa{1,2}b se|Available details ke hisa{1,2}b se|Jo details available hain unke hisa{1,2}b se),?\s*/i.test(cleanText(value));
}

function stripContextLead(value = "") {
  return cleanText(value).replace(/^(Context ke hisa{1,2}b se|Available details ke hisa{1,2}b se|Jo details available hain unke hisa{1,2}b se),?\s*/i, "");
}

function isLessonLike(value = "") {
  return /lesson|takeaway|audience ko yaad|yaad rehni|samjhati hai|financial decisions me risk|chhoti warning ko ignore/i.test(cleanText(value));
}

function normalizeTopic(topic = "") {
  return cleanText(topic || "ye story");
}

function detectMode(researchContext = {}, researchNarrative = {}, channel = {}) {
  const text = [
    researchContext.research_type,
    researchNarrative.narrative_mode,
    channel.contentMode,
    channel.niche,
    normalizeTopic(researchContext.topic || researchNarrative.topic)
  ].join(" ").toLowerCase();

  if (/haunted|ghost|paranormal|dybbuk|scarecrow|castle|doll|house|horror/.test(text)) return "horror_mystery";
  if (/murder|death|killer|unabomber|missing|case|crime|investigation|evidence|statement/.test(text)) return "investigation_documentary";
  if (/financial|loan|fraud|scam|risk|money|transaction/.test(text)) return "risk_breakdown";
  if (/history|historical|archive|record|old/.test(text)) return "record_based_mystery";
  if (/local|village|gaon/.test(text)) return "local_claim_mystery";
  if (/fact|explainer|misconception/.test(text)) return "misconception_explainer";

  return "story_documentary";
}

function verificationSummary(researchContext = {}, researchNarrative = {}) {
  return {
    verification_status:
      cleanText(researchNarrative.verification_status) ||
      cleanText(researchContext.verification_status) ||
      "offline_inferred",
    confidence_score:
      Number(researchNarrative.confidence_score || researchContext.confidence_score || 0.5),
    risk_level:
      cleanText(researchNarrative.risk_level || researchContext.risk_level || "medium")
  };
}

function extractTimelineLines(topic = "", researchContext = {}, researchNarrative = {}) {
  const timeline = toArray(researchContext.timeline)
    .map(item => cleanText(item.event || item.label || ""))
    .filter(Boolean);

  const beatLines = toArray(researchNarrative.beats)
    .map(item => cleanText(item.narration || item.line || ""))
    .filter(Boolean);

  const lines = [...timeline, ...beatLines]
    .filter(line => !/Initial decision or offer|Risk signal appears|Numbers stop matching expectation|Final loss/i.test(line));

  return lines.length ? lines : [
    `${normalizeTopic(topic)} ki shuruaat ek normal situation se hoti hai`,
    "ek warning signal saamne aata hai",
    "details compare karne par mismatch clear hota hai",
    "end me story ek important lesson me badal jaati hai"
  ];
}

function extractEvidenceFacts(researchContext = {}, researchNarrative = {}) {
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
    .map(line => stripContextLead(line))
    .filter(line => !hasContextLead(line))
    .filter(line => !isLessonLike(line))
    .slice(0, 3);
}

function cleanArcLine(value = "") {
  return stripContextLead(value)
    .replace(/\bslowly\b/gi, "dheere dheere")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceSentence(topic = "", facts = [], fallback = "") {
  const cleanTopic = normalizeTopic(topic);
  const picked = facts.find(line => line && line.length > 35 && !isLessonLike(line));

  if (picked) {
    return sentence(cleanArcLine(picked));
  }

  const safeFallback = !isLessonLike(fallback) ? fallback : "";

  return sentence(safeFallback || `${cleanTopic} me records aur details compare karne par ek mismatch clear hone lagta hai`);
}

function compressBeatLine(value = "", beat = "") {
  let line = cleanArcLine(value);

  line = line
    .replace(/Lekin numbers ke andar asli risk chhupa tha\.\s*Lekin asli problem yahan shuru hoti hai:?\s*/i, "Lekin asli problem yahan shuru hoti hai: ")
    .replace(/Ab sawal ye tha ki .*?\?\s*/i, "")
    .replace(/Isi calculation ne poori story palat di\.\s*/i, "Isi point par story palat gayi. ")
    .replace(/dheere dheere expensive mistake me convert hone laga/gi, "mehngi galti banne laga")
    .replace(/ek ignored detail ko normal maan kar ignore kar diya gaya/gi, "ek ignored detail ko normal maan liya gaya")
    .replace(/warning end me nahi, shuruaat me hi saamne aa chuki thi/gi, "warning shuruaat me hi saamne aa chuki thi");

  if (beat === "context") {
    line = line
      .replace(/numbers, risk aur decision point important angle hain/gi, "numbers aur risk story ka main angle ban gaye")
      .replace(/important angle hain/gi, "main angle ban gaya");
  }

  if (beat === "evidence" && isLessonLike(line)) {
    line = "Records aur numbers compare karne par mismatch clear hone lagta hai";
  }

  return sentence(line);
}

function buildArc(topic = "", researchContext = {}, researchNarrative = {}, storyBlocks = {}, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const mode = detectMode(researchContext, researchNarrative, channel);
  const lines = extractTimelineLines(topic, researchContext, researchNarrative);
  const facts = extractEvidenceFacts(researchContext, researchNarrative);
  const hook =
    cleanText(storyBlocks.hook) ||
    cleanText(storyBlocks.documentary_hook) ||
    `${cleanTopic} me ek ignored detail ne poori story ka angle badal diya...`;

  const lesson =
    cleanText(storyBlocks.lesson) ||
    cleanText(storyBlocks.documentary_takeaway) ||
    "Is story ka lesson simple hai: chhoti warning ko ignore karna mehnga pad sakta hai.";

  const modeLines = {
    risk_breakdown: {
      context: `${cleanTopic} me shuruaat ek normal financial decision se hoti hai, jahan sab kuch safe lag raha tha`,
      complication: "Lekin asli problem yahan shuru hoti hai: ek early signal ko normal samajhkar ignore kar diya gaya",
      evidence: "Jab records aur numbers dobara compare hue, expectation aur reality ek dusre se match nahi kar rahe the",
      escalation: "Delay badhta gaya, aur wahi chhota risk dheere dheere expensive mistake me convert hone laga",
      reveal: "Tab samajh aaya ki real issue end me nahi, shuruaat me hi dikh raha tha"
    },
    investigation_documentary: {
      context: `${cleanTopic} me pehli report simple lagti hai, lekin timeline me ek gap chhupa hota hai`,
      complication: "Lekin statements aur evidence compare hote hi case ka pressure badhne lagta hai",
      evidence: "Ek ignored clue file me baar baar repeat hota hai, aur wahi investigation ka center ban jaata hai",
      escalation: "Jitni details connect hoti hain, utne naye sawal khade hone lagte hain",
      reveal: "Tab samajh aata hai ki case ka sabse important point pehle hi ignore ho gaya tha"
    },
    record_based_mystery: {
      context: `${cleanTopic} me popular kahani se zyada old records important ban jaate hain`,
      complication: "Lekin jab records compare hote hain, ek mismatch poori story ko doubtful bana deta hai",
      evidence: "Archive me mili ek detail purane version par sawal khada kar deti hai",
      escalation: "Jitne references milte hain, kahani utni hi layered hoti jaati hai",
      reveal: "Tab clear hota hai ki original story incomplete thi"
    },
    local_claim_mystery: {
      context: `${cleanTopic} me local claims aur silence dono story ko suspicious banate hain`,
      complication: "Lekin log jab is topic par chup hone lagte hain, mystery aur gehri ho jaati hai",
      evidence: "Repeated local detail ek important clue ki tarah saamne aati hai",
      escalation: "Har naye statement ke saath kahani ka pressure badhta jaata hai",
      reveal: "Tab samajh aata hai ki local warning sirf afwaah nahi thi"
    },
    misconception_explainer: {
      context: `${cleanTopic} ko samajhne ke liye pehle common misconception todna zaroori hai`,
      complication: "Lekin headline aur actual context ek jaise nahi hote",
      evidence: "Jab details dekhi jaati hain, topic ka real meaning clearer hota hai",
      escalation: "Isi wajah se surface-level explanation audience ko confuse kar sakti hai",
      reveal: "Tab pata chalta hai ki answer simple nahi, context-based tha"
    },
    horror_mystery: {
      context: `${cleanTopic} ki kahani ek ajeeb aur disturbing detail se shuru hoti hai`,
      complication: "Log ise normal kahani samajh rahe the, lekin ek pattern baar baar repeat ho raha tha",
      evidence: "Ek chhoti si jagah, object ya witness detail poori mystery ko serious bana deti hai",
      escalation: "Jab purani details connect hoti hain, haunted angle aur strong ho jaata hai",
      reveal: "End me sabse scary cheez woh unanswered detail hoti hai jo clear nahi hoti"
    },
    story_documentary: {
      context: `${cleanTopic} ki shuruaat normal lagti hai, lekin ek detail quietly build ho rahi thi`,
      complication: "Lekin wahi chhoti detail baad me poori kahani ka pressure point ban jaati hai",
      evidence: "Jab details compare hoti hain, ek hidden mismatch saamne aata hai",
      escalation: "Yahin se story simple incident se serious angle me badalne lagti hai",
      reveal: "Tab samajh aata hai ki real twist ek ignored clue me chhupa tha"
    }
  };

  const base = modeLines[mode] || modeLines.story_documentary;

  return {
    mode,
    hook: sentence(hook.replace(/\.$/, "...")),
    context: sentence(cleanArcLine(lines[0] && lines[0].length > 35 ? lines[0] : base.context)),
    complication: sentence(base.complication),
    evidence: evidenceSentence(cleanTopic, facts, lines[1] && lines[1].length > 35 ? lines[1] : base.evidence),
    escalation: sentence(cleanArcLine(lines[2] && lines[2].length > 35 ? lines[2] : base.escalation)),
    reveal: sentence(base.reveal),
    lesson: sentence(cleanArcLine(lesson))
  };
}

function retentionTriggers(mode = "story_documentary") {
  const common = {
    after_context: "Lekin asli problem yahan shuru hoti hai.",
    after_complication: "Ab sawal seedha tha.",
    before_reveal: "Isi point par angle palat jaata hai."
  };

  if (mode === "risk_breakdown") {
    return {
      after_context: "Lekin numbers ke andar asli risk chhupa tha.",
      after_complication: "Ab sawal calculation ka tha.",
      before_reveal: "Isi calculation ne story palat di."
    };
  }

  if (mode === "horror_mystery") {
    return {
      after_context: "Lekin yahin se darr ka pattern shuru hua.",
      after_complication: "Ab sawal ye tha ki ye sirf afwaah thi ya kuch aur.",
      before_reveal: "Isi detail ne kahani ko haunted angle de diya."
    };
  }

  if (mode === "investigation_documentary") {
    return {
      after_context: "Lekin case file me ek gap chhupa tha.",
      after_complication: "Ab sawal evidence ka tha.",
      before_reveal: "Isi clue ne direction badal diya."
    };
  }

  return common;
}

function buildBeatsFromArc(arc = {}) {
  const triggers = retentionTriggers(arc.mode);

  return [
    {
      beat: "hook",
      second_range: "0-3",
      narration: arc.hook,
      visual_intent: "bold topic text, fast suspense opener"
    },
    {
      beat: "context",
      second_range: "3-7",
      narration: arc.context,
      visual_intent: "context scene, slow push-in"
    },
    {
      beat: "complication",
      second_range: "7-12",
      narration: triggers.after_context + " " + arc.complication,
      visual_intent: "warning sign, documents, uneasy transition"
    },
    {
      beat: "evidence",
      second_range: "12-18",
      narration: triggers.after_complication + " " + arc.evidence,
      visual_intent: "records, timeline, highlighted detail"
    },
    {
      beat: "escalation",
      second_range: "18-23",
      narration: arc.escalation,
      visual_intent: "faster cuts, increasing pressure"
    },
    {
      beat: "reveal",
      second_range: "23-27",
      narration: triggers.before_reveal + " " + arc.reveal,
      visual_intent: "dramatic reveal, contrast shift"
    },
    {
      beat: "lesson",
      second_range: "27-30",
      narration: arc.lesson,
      visual_intent: "clean lesson text, final pause"
    }
  ].map(item => ({
    ...item,
    narration: sentence(item.narration)
  }));
}

function normalizeRepeatedConcepts(beats = []) {
  const seenConcepts = new Set();
  const conceptRewrites = {
    warning: [
      [/warning signal/gi, "early signal"],
      [/warning point/gi, "risk point"],
      [/\bwarning\b/gi, "signal"]
    ],
    risk: [
      [/\brisk signal\b/gi, "hidden mismatch"],
      [/\brisk\b/gi, "pressure"]
    ]
  };

  function conceptsFor(text = "") {
    const concepts = [];
    if (/warning signal|risk signal|warning point|\bwarning\b/i.test(text)) concepts.push("warning");
    if (/\brisk\b/i.test(text)) concepts.push("risk");
    return concepts;
  }

  return beats.map(beat => {
    let narration = cleanText(beat.narration);
    const concepts = conceptsFor(narration);

    concepts.forEach(concept => {
      if (seenConcepts.has(concept) && beat.beat !== "lesson") {
        conceptRewrites[concept].forEach(([match, replacement]) => {
          narration = narration.replace(match, replacement);
        });
      }
      seenConcepts.add(concept);
    });

    return {
      ...beat,
      narration: compressBeatLine(narration, beat.beat)
    };
  });
}

function compactForThirtySeconds(beats = []) {
  const joined = beats.map(beat => beat.narration).join(" ");

  if (wordCount(joined) <= 94) return beats;

  const compacted = beats.map(beat => {
    let narration = cleanText(beat.narration)
      .replace(/Jo details available hain unke hisaab se,\s*/gi, "")
      .replace(/Context ke hisa{1,2}b se,\s*/gi, "")
      .replace(/Available offline clues ke basis par,\s*/gi, "")
      .replace(/normal samajhkar/gi, "normal maan kar")
      .replace(/ek dusre se match nahi kar rahe the/gi, "match nahi kar rahe the")
      .replace(/dheere dheere/gi, "slowly");

    if (beat.beat === "evidence") {
      narration = narration.replace(/Ab sawal ye tha ki .*?\?\s*/i, "");
      narration = narration.replace(/Ab sawal [^.?!]*[.?!]\s*/i, "");
    }

    return {
      ...beat,
      narration: compressBeatLine(narration, beat.beat)
    };
  });

  if (wordCount(compacted.map(beat => beat.narration).join(" ")) <= 94) {
    return compacted;
  }

  const finalCompaction = {
    context: [
      [/numbers, pressure aur decision point main angle ban gaya/gi, "numbers aur pressure main angle bane"],
      [/numbers, risk aur decision point main angle ban gaya/gi, "numbers aur risk main angle bane"]
    ],
    complication: [
      [/Lekin asli problem yahan shuru hoti hai:\s*/gi, "Lekin problem yahan thi: "],
      [/Lekin numbers ke andar asli risk chhupa tha\.\s*/gi, "Numbers me risk chhupa tha. "],
      [/Lekin numbers ke andar asli pressure chhupa tha\.\s*/gi, "Numbers me pressure chhupa tha. "],
      [/ek early signal ko normal maan kar ignore kar diya gaya/gi, "early signal ignore hua"]
    ],
    evidence: [
      [/^[^.]+ me numbers, pressure aur decision point sabse important research angle hain/gi, "Numbers aur pressure ka mismatch key evidence tha"],
      [/^[^.]+ me numbers, risk aur decision point sabse important research angle hain/gi, "Numbers aur risk ka mismatch key evidence tha"],
      [/sabse important research angle hain/gi, "key evidence tha"]
    ],
    reveal: [
      [/Isi point par angle palat jaata hai\.\s*/gi, "Yahin angle palta. "],
      [/Isi calculation ne story palat di\.\s*/gi, "Yahin story palti. "],
      [/Tab samajh aaya ki real issue end me nahi, shuruaat me hi dikh raha tha/gi, "Real issue shuruaat me hi dikh raha tha"]
    ],
    lesson: [
      [/Is story ka lesson simple hai:\s*/gi, "Lesson simple hai: "],
      [/chhoti warning ko ignore karna mehnga pad sakta hai/gi, "small signals ignore karna mehnga padta hai"],
      [/Financial decisions me risk ko ignore karna sabse mehngi galti sabit ho sakta hai/gi, "Risk ignore karna mehngi galti ban sakta hai"]
    ]
  };

  return compacted.map(beat => {
    let narration = cleanText(beat.narration);

    (finalCompaction[beat.beat] || []).forEach(([match, replacement]) => {
      narration = narration.replace(match, replacement);
    });

    return {
      ...beat,
      narration: compressBeatLine(narration, beat.beat)
    };
  });
}

function scoreV3(beats = [], verification = {}) {
  const text = beats.map(item => item.narration).join(" ");
  const words = wordCount(text);
  const duplicateSentences = [];
  const seen = new Set();

  beats.forEach(beat => {
    const key = beat.narration.toLowerCase();
    if (seen.has(key)) duplicateSentences.push(beat.beat);
    seen.add(key);
  });

  const hasLabels = /Initial decision or offer|Risk signal appears|Numbers stop matching expectation|Final loss/i.test(text);
  const hasHook = wordCount(beats[0]?.narration || "") >= 6;
  const hasReveal = beats.some(item => item.beat === "reveal" && /palat|palti|samajh|clear|twist|warning|direction|real issue/i.test(item.narration));
  const hasRetention = /Lekin|Ab sawal|Isi point|Isi clue|Isi calculation|story palat/i.test(text);
  const hasBadContext = /Context ke hisa{1,2}b se/i.test(text);
  const hasEvidenceAsLesson = beats.some(item => item.beat === "evidence" && isLessonLike(item.narration));
  const hasDuplicateConcepts = (() => {
    const conceptBeats = {};
    beats.forEach(item => {
      const narration = cleanText(item.narration);
      if (/warning signal|risk signal|warning point|\bwarning\b/i.test(narration)) {
        conceptBeats.warning = [...(conceptBeats.warning || []), item.beat];
      }
    });

    return Object.values(conceptBeats).some(items => items.filter(beat => beat !== "lesson").length > 1);
  })();

  let score = 100;

  if (words < 55) score -= 10;
  if (words > 94) score -= 12;
  if (words > 100) score -= 15;
  if (words > 110) score -= 25;
  if (duplicateSentences.length) score -= 20;
  if (hasLabels) score -= 35;
  if (!hasHook) score -= 10;
  if (!hasReveal) score -= 15;
  if (!hasRetention) score -= 10;
  if (hasBadContext) score -= 15;
  if (hasEvidenceAsLesson) score -= 20;
  if (hasDuplicateConcepts) score -= 12;
  if ((verification.confidence_score || 0) < 0.6) score -= 3;

  return {
    score: Math.max(0, Math.min(100, score)),
    word_count: words,
    estimated_duration_seconds: 30,
    duplicate_sentence_beats: duplicateSentences,
    has_timeline_labels: hasLabels,
    hook_strength: hasHook ? "good" : "weak",
    reveal_strength: hasReveal ? "good" : "weak",
    retention_strength: hasRetention ? "good" : "weak",
    has_bad_context_phrase: hasBadContext,
    has_evidence_as_lesson: hasEvidenceAsLesson,
    has_duplicate_warning_concept: hasDuplicateConcepts,
    confidence_note:
      (verification.confidence_score || 0) < 0.6
        ? "Medium confidence: safe documentary wording used."
        : "Confidence acceptable for documentary narration."
  };
}

function rewriteV3(beats = [], quality = {}) {
  let rewritten = normalizeRepeatedConcepts(beats);
  rewritten = compactForThirtySeconds(rewritten);

  if (quality.has_timeline_labels) {
    rewritten = rewritten.map(beat => ({
      ...beat,
      narration: sentence(
        beat.narration
          .replace(/Initial decision or offer/gi, "normal decision")
          .replace(/Risk signal appears/gi, "warning signal saamne aata hai")
          .replace(/Numbers stop matching expectation/gi, "numbers match nahi karte")
          .replace(/Final loss, lesson, or warning/gi, "final warning")
      )
    }));
  }

  return rewritten;
}

function buildDocumentaryScriptV3(topic = "", options = {}) {
  const researchContext = options.researchContext || {};
  const researchNarrative = options.researchNarrative || {};
  const storyBlocks = options.storyBlocks || {};
  const channel = options.channel || {};
  const verification = verificationSummary(researchContext, researchNarrative);

  const arc = buildArc(topic, researchContext, researchNarrative, storyBlocks, channel);
  const rawBeats = buildBeatsFromArc(arc);
  const firstQuality = scoreV3(rawBeats, verification);
  const rewrittenBeats = rewriteV3(rawBeats, firstQuality);
  const finalQuality = scoreV3(rewrittenBeats, verification);

  return {
    version: "phase_26_final_script_generation_v3",
    format: "30_second_documentary",
    topic: normalizeTopic(topic),
    mode: arc.mode,
    verification,
    story_arc: arc,
    scene_beats: rewrittenBeats,
    retention_triggers: retentionTriggers(arc.mode),
    narration_script: rewrittenBeats.map(item => item.narration).join(" "),
    quality_score: finalQuality
  };
}

module.exports = {
  buildDocumentaryScriptV3,
  buildArc,
  buildBeatsFromArc,
  scoreV3
};
