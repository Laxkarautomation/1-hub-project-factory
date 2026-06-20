const assert = require("assert");

const {
  buildDocumentaryScriptV3
} = require("./core/script_generation_v3");
const {
  buildScriptBriefs
} = require("./core/script_brief_builder");

function wordCount(text = "") {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

const topic = "Sample loan case";
const channel = {
  contentMode: "finance",
  niche: "financial risk",
  hookStyles: ["curiosity"],
  targetAudience: "viewers",
  storyFormulas: ["PROBLEM-AGITATE-SOLVE"],
  contentPillars: ["risk signal", "warning signal"],
  topicKeywords: ["loan", "documents"]
};
const researchContext = {
  topic,
  research_type: "financial_case",
  verification_status: "offline_inferred",
  confidence_score: 0.72,
  risk_level: "medium",
  timeline: [
    { event: "Initial decision or offer" },
    { event: "Risk signal appears" },
    { event: "Numbers stop matching expectation" },
    { event: "Final loss, lesson, or warning" }
  ],
  facts: [
    { fact: "Is case ka lesson simple hai: financial decision me risk signal ko kabhi ignore nahi karna chahiye." },
    { fact: "Loan documents aur repayment numbers compare karne par expected amount aur actual liability ka mismatch clear hota hai." }
  ],
  research_summary: "Context ke hisab se, loan documents aur repayment numbers compare karne par mismatch clear hota hai.",
  source_context: "Available details ke hisaab se, repayment schedule aur charges ek jaise explain nahi hote."
};

const script = buildDocumentaryScriptV3(topic, {
  channel,
  researchContext,
  researchNarrative: {
    narrative_mode: "risk_breakdown",
    documentary_evidence: "Is case ka lesson simple hai: risk signal ko ignore nahi karna chahiye.",
    evidence_line: "Takeaway ye hai ki loan details verify karni chahiye."
  },
  storyBlocks: {
    documentary_hook: "Sample loan case me ek hidden mismatch poori story badal deta hai...",
    lesson: "Is story ka lesson simple hai: chhoti warning ko ignore karna mehnga pad sakta hai."
  }
});

assert.strictEqual(script.version, "phase_26_final_script_generation_v3");
assert.ok(wordCount(script.narration_script) < 95, "final narration should stay under 95 words");
assert.ok(script.quality_score.score >= 85, "quality score should be 85+");
assert.strictEqual(script.quality_score.has_timeline_labels, false);
assert.strictEqual(script.quality_score.has_bad_context_phrase, false);
assert.strictEqual(script.quality_score.has_evidence_as_lesson, false);
assert.strictEqual(script.quality_score.has_duplicate_warning_concept, false);
assert.ok(!/Context ke hisa{1,2}b se/i.test(script.narration_script));
assert.ok(!/Initial decision or offer|Risk signal appears|Numbers stop matching expectation|Final loss/i.test(script.narration_script));

const evidenceBeat = script.scene_beats.find(beat => beat.beat === "evidence");
assert.ok(evidenceBeat, "evidence beat should exist");
assert.ok(!/lesson|takeaway/i.test(evidenceBeat.narration), "evidence beat should not use lesson/takeaway wording");

const brief = buildScriptBriefs(
  [{ rank: 1, topic, suggested_formula: "PROBLEM-AGITATE-SOLVE" }],
  {
    channel,
    researchContexts: [{ topic, research_context: researchContext }]
  }
)[0];

assert.strictEqual(brief.documentary_script.version, "phase_26_final_script_generation_v3");
assert.ok(brief.documentary_script_v2);
assert.strictEqual(brief.narration_script, brief.documentary_script.narration_script);
assert.deepStrictEqual(brief.scene_beats, brief.documentary_script.scene_beats);

console.log(JSON.stringify({
  success: true,
  phase: "26x-script-generation-v3",
  score: script.quality_score.score,
  word_count: script.quality_score.word_count
}, null, 2));
