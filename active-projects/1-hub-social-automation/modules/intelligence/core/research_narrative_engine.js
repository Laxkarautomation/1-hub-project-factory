function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
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


function isGenericNarrativeEntity(value = "") {
  const lower = cleanText(value).toLowerCase();

  return [
    "village",
    "gaon",
    "missing",
    "crime",
    "mystery",
    "incident",
    "victim",
    "witness",
    "investigator",
    "suspect",
    "customer",
    "investor",
    "company",
    "bank",
    "transaction",
    "record",
    "archive",
    "audience",
    "source",
    "location"
  ].includes(lower);
}

function bestResearchEntity(researchContext = {}, topic = "") {
  const cleanTopic = cleanText(topic || researchContext.topic || "");
  const primary = cleanText(researchContext.primary_subject || "");

  if (primary && !isGenericNarrativeEntity(primary)) return primary;
  if (cleanTopic) return cleanTopic;

  const entities = toArray(researchContext.entities)
    .filter(item => item && item.name)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const strong = entities.find(item => !isGenericNarrativeEntity(item.name));
  return cleanText(strong?.name || entities[0]?.name || cleanTopic || "main subject");
}

function convertBeatToNarration(topic = "", beat = {}, mode = "story_documentary") {
  const line = cleanText(beat.line || "");
  const cleanTopic = cleanText(topic || "ye topic");

  if (!line) return "";

  if (/^Initial incident or report$/i.test(line)) {
    if (mode === "investigation_documentary") return cleanTopic + " me shuruaat ek simple report se hoti hai.";
    return cleanTopic + " ki shuruaat ek normal situation se hoti hai.";
  }

  if (/^Evidence or statement contradiction$/i.test(line)) {
    return "Phir evidence aur statement ke beech mismatch dikhna shuru hota hai.";
  }

  if (/^Ignored clue becomes important$/i.test(line)) {
    return "Ek ignored clue dheere dheere poori story ka center banne lagta hai.";
  }

  if (/^Final reveal or unresolved question$/i.test(line)) {
    return "End tak case ek reveal ya unresolved question ke point par pahunchta hai.";
  }

  if (/^Initial decision or offer$/i.test(line)) {
    return cleanTopic + " me shuruaat ek normal offer ya decision se hoti hai.";
  }

  if (/^Risk signal appears$/i.test(line)) {
    return "Phir ek risk signal saamne aata hai jise pehle ignore kiya jaata hai.";
  }

  if (/^Numbers stop matching expectation$/i.test(line)) {
    return "Baad me numbers expectation se match karna band kar dete hain.";
  }

  if (/^Final loss, lesson, or warning$/i.test(line)) {
    return "End me ye story loss, lesson ya warning me convert ho jaati hai.";
  }

  return line;
}

function buildDocumentaryBlocks(topic = "", researchNarrative = {}) {
  const cleanTopic = cleanText(topic || researchNarrative.topic || "ye topic");
  const mode = cleanText(researchNarrative.narrative_mode || "story_documentary");
  const beats = toArray(researchNarrative.beats);

  const normalized = beats.map(beat => ({
    ...beat,
    narration: convertBeatToNarration(cleanTopic, beat, mode)
  }));

  const byBeat = {};
  normalized.forEach(item => {
    byBeat[item.beat] = item.narration;
  });

  return {
    documentary_hook:
      mode === "investigation_documentary"
        ? cleanTopic + " me ek timeline gap poori story ka direction badal deta hai..."
        : mode === "risk_breakdown"
          ? cleanTopic + " me ek small risk signal sabse bada warning point ban jaata hai..."
          : cleanTopic + " me ek detail poori kahani ka angle badal deti hai...",
    documentary_setup: byBeat.setup || cleanTopic + " ki shuruaat ek normal context se hoti hai.",
    documentary_conflict: byBeat.conflict || "Phir ek hidden mismatch story ko serious bana deta hai.",
    documentary_evidence: byBeat.evidence || "Ek important detail poori direction badal deti hai.",
    documentary_turn: byBeat.turn || "Jab details connect hoti hain, kahani ka real angle saamne aata hai.",
    documentary_takeaway: byBeat.takeaway || "Aakhir me chhoti detail hi sabse important point ban jaati hai."
  };
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
    .replace(/\s+/g, " ")
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
  const entity = bestResearchEntity(researchContext, topic);
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
  const entity = bestResearchEntity(researchContext, topic);
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

  const documentary_blocks = buildDocumentaryBlocks(cleanTopic, { narrative_mode: mode, beats });

  return {
    topic: cleanTopic,
    narrative_mode: mode,
    focus,
    beats,
    documentary_blocks,
    scene_plan: beats.map(item => convertBeatToNarration(cleanTopic, item, mode)),
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
  buildBeatsFromTimeline,
  buildDocumentaryBlocks,
  bestResearchEntity
};
