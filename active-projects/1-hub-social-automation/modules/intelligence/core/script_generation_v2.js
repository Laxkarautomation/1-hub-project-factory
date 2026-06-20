function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function wordCount(text = "") {
  return cleanText(text).split(/\s+/).filter(Boolean).length;
}

function clampSentence(text = "", fallback = "") {
  const value = cleanText(text || fallback);
  if (!value) return "";
  return /[.!?…]$/.test(value) ? value : value + ".";
}

function safeTopic(topic = "") {
  return cleanText(topic || "ye story");
}

function resolveVerification(researchContext = {}, researchNarrative = {}) {
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

function safeLanguagePrefix(verification = {}) {
  const status = cleanText(verification.verification_status);
  const risk = cleanText(verification.risk_level);

  if (status === "verified" && risk === "low") return "";
  if (risk === "high") return "Available offline clues ke basis par, ";
  return "Jo details available hain unke hisaab se, ";
}

function timelineItems(researchContext = {}, researchNarrative = {}) {
  const timeline = toArray(researchContext.timeline)
    .map(item => ({
      label: cleanText(item.label || ""),
      event: cleanText(item.event || ""),
      confidence: cleanText(item.confidence || "inferred")
    }))
    .filter(item => item.event || item.label);

  if (timeline.length) return timeline;

  return toArray(researchNarrative.beats)
    .map(item => ({
      label: cleanText(item.beat || ""),
      event: cleanText(item.narration || item.line || ""),
      confidence: cleanText(item.confidence || "inferred")
    }))
    .filter(item => item.event || item.label);
}

function narrationFromTimelineItem(topic = "", item = {}, index = 0, mode = "story_documentary", verification = {}) {
  const cleanTopic = safeTopic(topic);
  const label = cleanText(item.label).toLowerCase();
  const event = cleanText(item.event);
  const prefix = index === 0 ? safeLanguagePrefix(verification) : "";

  if (event && event.length > 28 && !/initial decision or offer|risk signal appears|numbers stop matching expectation|final loss/i.test(event)) {
    return clampSentence(prefix + event);
  }

  if (/initial|start|decision|offer|setup/.test(label + " " + event.toLowerCase())) {
    if (mode === "risk_breakdown") {
      return clampSentence(prefix + cleanTopic + " me shuruaat ek normal financial decision se hoti hai, jahan sab kuch safe lag raha tha");
    }
    if (mode === "investigation_documentary") {
      return clampSentence(prefix + cleanTopic + " me pehli report simple lagti hai, lekin timeline me ek gap chhupa hota hai");
    }
    return clampSentence(prefix + cleanTopic + " ki shuruaat normal lagti hai, lekin ek detail story ka direction badalne wali hoti hai");
  }

  if (/risk|warning|signal|red flag|conflict/.test(label + " " + event.toLowerCase())) {
    return clampSentence("Phir ek warning signal saamne aata hai, jise shuru me normal samajhkar ignore kar diya jaata hai");
  }

  if (/number|expectation|mismatch|evidence|statement|proof|clue/.test(label + " " + event.toLowerCase())) {
    return clampSentence("Jab details dobara compare hoti hain, numbers aur expectations ek dusre se match karna band kar dete hain");
  }

  if (/turn|twist|reveal|loss|lesson|takeaway|final|ending/.test(label + " " + event.toLowerCase())) {
    return clampSentence("End tak ye case ek clear warning me badal jaata hai, jahan chhota risk signal sabse bada lesson ban jaata hai");
  }

  return clampSentence(prefix + (event || cleanTopic + " me ek important development saamne aata hai"));
}

function buildTimelineNarration(topic = "", researchContext = {}, researchNarrative = {}) {
  const mode = cleanText(researchNarrative.narrative_mode || "story_documentary");
  const verification = resolveVerification(researchContext, researchNarrative);
  const items = timelineItems(researchContext, researchNarrative);

  const narration = items.map((item, index) =>
    narrationFromTimelineItem(topic, item, index, mode, verification)
  );

  const fallback = [
    narrationFromTimelineItem(topic, { label: "initial decision" }, 0, mode, verification),
    narrationFromTimelineItem(topic, { label: "risk signal" }, 1, mode, verification),
    narrationFromTimelineItem(topic, { label: "numbers mismatch" }, 2, mode, verification),
    narrationFromTimelineItem(topic, { label: "final lesson" }, 3, mode, verification)
  ];

  return (narration.length ? narration : fallback).slice(0, 5);
}

function buildSceneBeats(topic = "", timelineNarration = [], researchNarrative = {}, storyBlocks = {}) {
  const hook =
    cleanText(storyBlocks.hook) ||
    cleanText(storyBlocks.documentary_hook) ||
    cleanText(researchNarrative.documentary_hook) ||
    safeTopic(topic) + " me ek ignored detail sabse badi warning ban gayi...";

  const lesson =
    cleanText(storyBlocks.lesson) ||
    cleanText(storyBlocks.documentary_takeaway) ||
    cleanText(researchNarrative.lesson) ||
    "Is story ka lesson simple hai: chhoti warning ko ignore karna mehnga pad sakta hai.";

  const lines = timelineNarration.filter(Boolean);

  return [
    {
      beat: "hook",
      second_range: "0-3",
      narration: clampSentence(hook.replace(/\.$/, "...")),
      visual_intent: "fast opening, topic text, subtle suspense"
    },
    {
      beat: "setup",
      second_range: "3-8",
      narration: lines[0] || clampSentence(safeTopic(topic) + " ki shuruaat ek normal situation se hoti hai"),
      visual_intent: "location/context shot, calm movement"
    },
    {
      beat: "conflict",
      second_range: "8-14",
      narration: lines[1] || clampSentence("Phir ek warning signal saamne aata hai"),
      visual_intent: "documents, numbers, warning sign"
    },
    {
      beat: "evidence",
      second_range: "14-20",
      narration: lines[2] || clampSentence("Jab details compare hoti hain, mismatch clear hone lagta hai"),
      visual_intent: "close-up evidence, timeline, records"
    },
    {
      beat: "turn",
      second_range: "20-26",
      narration: lines[3] || clampSentence("Yahin se poori story ka real angle saamne aata hai"),
      visual_intent: "dramatic reveal, darker transition"
    },
    {
      beat: "takeaway",
      second_range: "26-30",
      narration: clampSentence(lesson),
      visual_intent: "final lesson text, clean ending"
    }
  ];
}

function buildDocumentaryFlow(sceneBeats = []) {
  return sceneBeats.map((beat, index) => ({
    order: index + 1,
    beat: beat.beat,
    second_range: beat.second_range,
    narration: beat.narration,
    visual_intent: beat.visual_intent
  }));
}

function buildEmotionalCurve(sceneBeats = []) {
  const curveMap = {
    hook: "curiosity spike",
    setup: "context calm",
    conflict: "tension rise",
    evidence: "doubt and focus",
    turn: "reveal pressure",
    takeaway: "lesson clarity"
  };

  return sceneBeats.map(beat => ({
    beat: beat.beat,
    emotion: curveMap[beat.beat] || "attention",
    intensity:
      beat.beat === "hook" ? 8 :
      beat.beat === "turn" ? 9 :
      beat.beat === "takeaway" ? 7 :
      6
  }));
}

function optimizeForRetention(sceneBeats = []) {
  return sceneBeats.map(beat => {
    let narration = cleanText(beat.narration);

    if (beat.beat === "hook") {
      narration = narration.replace(/\.$/, "...");
    }

    if (beat.beat === "conflict" && !/lekin|par|phir/i.test(narration)) {
      narration = "Lekin " + narration.charAt(0).toLowerCase() + narration.slice(1);
    }

    if (beat.beat === "turn" && !/yahin|tab|isi/i.test(narration)) {
      narration = "Yahin se " + narration.charAt(0).toLowerCase() + narration.slice(1);
    }

    return {
      ...beat,
      narration: clampSentence(narration)
    };
  });
}

function scoreScript(sceneBeats = [], verification = {}) {
  const fullText = sceneBeats.map(item => item.narration).join(" ");
  const words = wordCount(fullText);
  const hasHook = sceneBeats.some(item => item.beat === "hook" && wordCount(item.narration) >= 5);
  const hasTakeaway = sceneBeats.some(item => item.beat === "takeaway" && wordCount(item.narration) >= 6);
  const hasLabels = /Initial decision or offer|Risk signal appears|Numbers stop matching expectation|Final loss/i.test(fullText);

  let score = 100;

  if (words < 55) score -= 15;
  if (words > 95) score -= 10;
  if (!hasHook) score -= 15;
  if (!hasTakeaway) score -= 15;
  if (hasLabels) score -= 30;
  if ((verification.confidence_score || 0) < 0.6) score -= 5;

  return {
    score: Math.max(0, Math.min(100, score)),
    word_count: words,
    estimated_duration_seconds: 30,
    has_timeline_labels: hasLabels,
    confidence_note:
      (verification.confidence_score || 0) < 0.6
        ? "Medium confidence: narration uses safe language."
        : "Confidence acceptable for documentary narration."
  };
}

function rewriteIfNeeded(sceneBeats = [], quality = {}) {
  if (!quality.has_timeline_labels) return sceneBeats;

  return sceneBeats.map(beat => ({
    ...beat,
    narration: clampSentence(
      cleanText(beat.narration)
        .replace(/Initial decision or offer/gi, "shuruaat ek normal decision se hoti hai")
        .replace(/Risk signal appears/gi, "ek risk signal saamne aata hai")
        .replace(/Numbers stop matching expectation/gi, "numbers expectation se match nahi karte")
        .replace(/Final loss, lesson, or warning/gi, "story ek warning me badal jaati hai")
    )
  }));
}

function buildThirtySecondScript(topic = "", options = {}) {
  const researchContext = options.researchContext || {};
  const researchNarrative = options.researchNarrative || {};
  const storyBlocks = options.storyBlocks || {};

  const verification = resolveVerification(researchContext, researchNarrative);
  const timeline_narration = buildTimelineNarration(topic, researchContext, researchNarrative);
  const rawBeats = buildSceneBeats(topic, timeline_narration, researchNarrative, storyBlocks);
  const optimizedBeats = optimizeForRetention(rawBeats);
  const firstQuality = scoreScript(optimizedBeats, verification);
  const rewrittenBeats = rewriteIfNeeded(optimizedBeats, firstQuality);
  const finalQuality = scoreScript(rewrittenBeats, verification);

  return {
    version: "phase_26_script_generation_v2",
    topic: safeTopic(topic),
    format: "30_second_documentary",
    verification,
    timeline_narration,
    scene_beats: rewrittenBeats,
    documentary_flow: buildDocumentaryFlow(rewrittenBeats),
    emotional_curve: buildEmotionalCurve(rewrittenBeats),
    narration_script: rewrittenBeats.map(item => item.narration).join(" "),
    quality_score: finalQuality
  };
}

module.exports = {
  buildThirtySecondScript,
  buildTimelineNarration,
  buildSceneBeats,
  scoreScript
};
