function cleanText(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanId(value = "") {
  return String(value || "")
    .replace(/\s+/g, "_")
    .trim();
}

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function uniqueList(items = []) {
  return [...new Set(items.map(cleanText).filter(Boolean))];
}

function normalizeChannel(channel = {}, brief = {}) {
  return {
    channelId: cleanId(channel.channelId || brief.channelId || brief.channel || "active_channel"),
    contentMode: cleanText(channel.contentMode || brief.research_context?.research_type || "documentary"),
    niche: cleanText(channel.niche || ""),
    visualStyle: cleanText(channel.visualStyle || brief.visual_style || "channel-defined documentary visuals"),
    targetAudience: cleanText(channel.targetAudience || brief.target_audience || ""),
    contentPillars: uniqueList(channel.contentPillars || []),
    topicKeywords: uniqueList(channel.topicKeywords || []),
    blockedKeywords: uniqueList(channel.blockedKeywords || [])
  };
}

function getDocumentaryScript(brief = {}) {
  const script = brief.documentary_script || {};
  const beats = toArray(script.scene_beats);

  return {
    script,
    beats,
    hasV3Beats: beats.length > 0
  };
}

function extractResearchEntities(researchContext = {}) {
  const fromEntities = toArray(researchContext.entities)
    .map(item => cleanText(item.name || item.entity || ""))
    .filter(Boolean);

  const fromFacts = toArray(researchContext.facts)
    .map(item => cleanText(item.fact || item.text || item.detail || ""))
    .filter(Boolean)
    .slice(0, 3);

  return {
    entities: uniqueList(fromEntities).slice(0, 6),
    facts: fromFacts
  };
}

function pickSubjectAnchor(brief = {}, channel = {}) {
  const researchContext = brief.research_context || {};
  const primarySubject = cleanText(researchContext.primary_subject);
  if (primarySubject) return primarySubject;

  const entity = toArray(researchContext.entities)
    .map(item => cleanText(item.name || item.entity || ""))
    .find(Boolean);
  if (entity) return entity;

  const topicKeyword = toArray(channel.topicKeywords).map(cleanText).find(Boolean);
  const topic = cleanText(brief.topic);

  if (topic && topicKeyword && !topic.toLowerCase().includes(topicKeyword.toLowerCase())) {
    return `${topic} ${topicKeyword}`;
  }

  return topic || topicKeyword || "documentary subject";
}

function buildVisualVocabulary(brief = {}, channel = {}) {
  const researchContext = brief.research_context || {};
  const research = extractResearchEntities(researchContext);
  const beatTerms = toArray(brief.documentary_script?.scene_beats)
    .flatMap(beat => [
      beat.beat,
      beat.visual_intent,
      beat.narration
    ])
    .map(cleanText)
    .filter(Boolean);

  return uniqueList([
    brief.topic,
    brief.working_title,
    channel.contentMode,
    channel.niche,
    channel.visualStyle,
    ...channel.contentPillars,
    ...channel.topicKeywords,
    ...research.entities,
    ...beatTerms
  ]).slice(0, 24);
}

function buildSafetyRules(channel = {}) {
  return {
    blocked_keywords: uniqueList(channel.blockedKeywords || []),
    negative_prompt_hints: [
      "no readable text",
      "no watermark",
      "no gore",
      "no distorted faces",
      "no low resolution"
    ],
    safe_documentary_framing: true
  };
}

function buildVisualContext(brief = {}, options = {}) {
  const channel = normalizeChannel(options.channel || {}, brief);
  const researchContext = brief.research_context || {};
  const { script, beats, hasV3Beats } = getDocumentaryScript(brief);
  const subjectAnchor = pickSubjectAnchor(brief, channel);
  const research = extractResearchEntities(researchContext);

  return {
    version: "phase_27a_visual_context",
    topic: cleanText(brief.topic || script.topic || "documentary topic"),
    working_title: cleanText(brief.working_title || brief.topic || script.topic || ""),
    script_source: hasV3Beats ? "documentary_script_v3" : "missing_documentary_script_v3",
    documentary_mode: cleanText(script.mode || researchContext.research_type || channel.contentMode || "story_documentary"),
    channel,
    visual_style: channel.visualStyle,
    target_audience: channel.targetAudience,
    aspect_ratio: "vertical 9:16",
    subject_anchor: subjectAnchor,
    continuity: {
      subject_lock: subjectAnchor,
      style_lock: channel.visualStyle,
      palette_lock: derivePaletteLock(channel.visualStyle),
      recurring_visual_motifs: buildMotifs(brief, channel, research)
    },
    evidence: {
      entities: research.entities,
      facts: research.facts,
      evidence_objects: inferEvidenceObjects(brief, research)
    },
    safety: buildSafetyRules(channel),
    visual_vocabulary: buildVisualVocabulary(brief, channel),
    scene_count: beats.length,
    source_quality: {
      script_quality_score: script.quality_score?.score || null,
      has_timeline_labels: Boolean(script.quality_score?.has_timeline_labels)
    }
  };
}

function derivePaletteLock(visualStyle = "") {
  const value = cleanText(visualStyle).toLowerCase();
  if (/clean|trust|finance|local/.test(value)) return "clean documentary trust palette";
  if (/dark|mystery|suspense|crime/.test(value)) return "dark cinematic documentary palette";
  if (/bright|education|explainer/.test(value)) return "clear educational documentary palette";
  return "channel visual palette";
}

function buildMotifs(brief = {}, channel = {}, research = {}) {
  const modeText = [
    brief.documentary_script?.mode,
    brief.research_context?.research_type,
    channel.contentMode,
    brief.topic
  ].join(" ").toLowerCase();

  if (/finance|loan|money|fraud|transaction|risk/.test(modeText)) {
    return uniqueList(["documents", "records", "calculator", "phone screen without readable text", ...research.entities]).slice(0, 6);
  }

  if (/crime|investigation|case|evidence/.test(modeText)) {
    return uniqueList(["case files", "evidence board without readable text", "archive desk", ...research.entities]).slice(0, 6);
  }

  if (/village|local|town/.test(modeText)) {
    return uniqueList(["local street", "doorway", "community setting", ...research.entities]).slice(0, 6);
  }

  return uniqueList(["documentary location", "key object", "context detail", ...research.entities]).slice(0, 6);
}

function inferEvidenceObjects(brief = {}, research = {}) {
  const text = [
    brief.topic,
    brief.documentary_script?.mode,
    brief.research_context?.research_type,
    ...research.facts,
    ...research.entities
  ].join(" ").toLowerCase();

  if (/loan|emi|repayment|document|finance|money|transaction/.test(text)) {
    return uniqueList(["loan documents", "repayment records", "calculator", "bank form without readable text"]);
  }

  if (/crime|case|evidence|statement|investigation/.test(text)) {
    return uniqueList(["case file", "statement papers without readable text", "evidence photo layout"]);
  }

  if (/archive|record|history/.test(text)) {
    return uniqueList(["archive records", "old document close-up without readable text"]);
  }

  return uniqueList(["records", "key object", "context location"]);
}

module.exports = {
  buildVisualContext,
  normalizeChannel,
  getDocumentaryScript
};
