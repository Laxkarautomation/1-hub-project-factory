const fs = require("fs");

const contextPath = "modules/intelligence/core/story_context_builder.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";

let contextCode = fs.readFileSync(contextPath, "utf8");
let realizerCode = fs.readFileSync(realizerPath, "utf8");

if (!contextCode.includes("function pickSeeded")) {
  contextCode = contextCode.replace(
    `function pickRanked(terms = [], topic = "", index = 0, fallback = "") {
  const ranked = rankTerms(terms, topic);
  return ranked[index] || ranked[0] || fallback;
}
`,
    `function pickRanked(terms = [], topic = "", index = 0, fallback = "") {
  const ranked = rankTerms(terms, topic);
  return ranked[index] || ranked[0] || fallback;
}

function pickSeeded(terms = [], seed = "", offset = 0, fallback = "") {
  const list = unique(terms);
  if (!list.length) return fallback;
  const base = Array.from(normalize(seed)).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return list[Math.abs(base + offset) % list.length] || fallback;
}

function buildEscalationStages(topic = "", archetypeVocabulary = {}, vocabulary = {}) {
  const pool = unique([
    archetypeVocabulary.tension,
    archetypeVocabulary.trigger,
    archetypeVocabulary.evidence,
    archetypeVocabulary.twist,
    vocabulary.primary,
    vocabulary.secondary,
    vocabulary.tertiary,
    vocabulary.tension,
    vocabulary.twist
  ]);

  return {
    escalation_stage_1: pickSeeded(
      [
        \`\${archetypeVocabulary.trigger || vocabulary.secondary} ko pehle ignore kar diya gaya\`,
        \`\${archetypeVocabulary.tension || vocabulary.tension} par kisi ne khulkar baat nahi ki\`,
        \`\${vocabulary.primary || "main clue"} se judi ek chhoti baat repeat hone lagi\`,
        \`local log \${archetypeVocabulary.evidence || vocabulary.tertiary} ke baare me chup rahe\`
      ],
      topic,
      11,
      pool[0] || "pehli detail ignore ho gayi"
    ),
    escalation_stage_2: pickSeeded(
      [
        \`\${archetypeVocabulary.evidence || vocabulary.tertiary} ne purani story ko doubtful bana diya\`,
        \`\${archetypeVocabulary.tension || vocabulary.tension} aur \${archetypeVocabulary.trigger || vocabulary.secondary} ek dusre se connect hone lage\`,
        \`ek naya record purani baat se match nahi hua\`,
        \`\${vocabulary.secondary || "second clue"} ne case ko aur complicated bana diya\`
      ],
      topic,
      23,
      pool[1] || "dusri detail ne doubt badha diya"
    ),
    escalation_stage_3: pickSeeded(
      [
        \`\${archetypeVocabulary.twist || vocabulary.twist} ka hint tab mila jab sab clues ek jagah aaye\`,
        \`jis baat ko coincidence maana gaya tha, wahi pattern nikla\`,
        \`sabse important witness ya proof last moment par doubtful ho gaya\`,
        \`\${archetypeVocabulary.evidence || vocabulary.tertiary} ne hidden connection expose karna shuru kiya\`
      ],
      topic,
      37,
      pool[2] || "teesri detail ne asli angle khol diya"
    )
  };
}
`
  );
}

contextCode = contextCode.replace(
  `  const archetypeVocabulary = buildArchetypeVocabulary(cleanTopic, channel);

  const primaryCategory = pickRanked(categories, cleanTopic, 0, mode);

  return {`,
  `  const archetypeVocabulary = buildArchetypeVocabulary(cleanTopic, channel);
  const escalationStages = buildEscalationStages(cleanTopic, archetypeVocabulary, vocabulary);

  const primaryCategory = pickRanked(categories, cleanTopic, 0, mode);

  return {`
);

contextCode = contextCode.replace(
  `    evidence_object: archetypeVocabulary.evidence || vocabulary.tertiary,
    twist_source: archetypeVocabulary.twist || vocabulary.twist,`,
  `    evidence_object: archetypeVocabulary.evidence || vocabulary.tertiary,
    escalation_stage_1: escalationStages.escalation_stage_1,
    escalation_stage_2: escalationStages.escalation_stage_2,
    escalation_stage_3: escalationStages.escalation_stage_3,
    twist_source: archetypeVocabulary.twist || vocabulary.twist,`
);

realizerCode = realizerCode.replace(
  `  const evidence = clean(context.evidence_object || "ek purana record");
  const twist = clean(context.twist_source || "ek purana connection");
  const atmosphere = clean(context.atmosphere || "serious");`,
  `  const evidence = clean(context.evidence_object || "ek purana record");
  const escalation1 = clean(context.escalation_stage_1 || "pehli detail ignore ho gayi");
  const escalation2 = clean(context.escalation_stage_2 || "dusri detail ne doubt badha diya");
  const escalation3 = clean(context.escalation_stage_3 || "teesri detail ne asli angle khol diya");
  const twist = clean(context.twist_source || "ek purana connection");
  const atmosphere = clean(context.atmosphere || "serious");`
);

realizerCode = realizerCode.replace(
  `    conflict: \`Phir \${tension} ka angle saamne aaya. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi.\`,
    clue: \`Isi beech \${detail} se judi ek chhoti si information mili. Uske baad \${evidence} par sabki nazar gayi.\`,
    twist: \`Jab ye sab details connect hui, to \${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya.\`,`,
  `    conflict: \`Phir \${tension} ka angle saamne aaya. \${escalation1}. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi.\`,
    clue: \`Isi beech \${detail} se judi ek chhoti si information mili. Uske baad \${evidence} par sabki nazar gayi.\`,
    escalation: \`\${escalation2}. Phir \${escalation3}. Yahin se kahani simple incident se serious mystery banne lagi.\`,
    twist: \`Jab ye sab details connect hui, to \${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya.\`,`
);

fs.writeFileSync(contextPath, contextCode);
fs.writeFileSync(realizerPath, realizerCode);

console.log("✅ Phase 24.16 story tension escalation applied");
