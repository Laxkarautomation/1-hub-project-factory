const fs = require("fs");

const narrativePath = "modules/intelligence/core/research_narrative_engine.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";

let narrativeCode = fs.readFileSync(narrativePath, "utf8");
let realizerCode = fs.readFileSync(realizerPath, "utf8");

if (!narrativeCode.includes("function humanizeNarration")) {

const helper = `
function humanizeNarration(text = "", topic = "") {
  let value = cleanText(text);
  const cleanTopic = cleanText(topic);

  if (!value) return "";

  const replacements = [
    {
      match: /timeline important angle hai/i,
      replace: "Investigation ka sabse important point timeline me chhupa hua tha."
    },
    {
      match: /Evidence or statement contradiction/i,
      replace: "Jab statements aur evidence compare kiye gaye, kuch details match nahi kar rahi thi."
    },
    {
      match: /Ignored clue becomes important/i,
      replace: "Ek ignored clue dheere dheere poori investigation ka center ban gaya."
    },
    {
      match: /Final reveal or unresolved question/i,
      replace: "End tak kahani ek aise point par pahunch gayi jahan sach aur sawaal dono saath khade the."
    },
    {
      match: new RegExp(cleanTopic + " me " + cleanTopic + " se judi detail audience ko yaad rehni chahiye\\.", "i"),
      replace: "Is case ki sabse important detail audience ko yaad rehni chahiye."
    }
  ];

  replacements.forEach(rule => {
    value = value.replace(rule.match, rule.replace);
  });

  return cleanText(value);
}
`;

narrativeCode = narrativeCode.replace(
"function convertBeatToNarration(topic = \"\", beat = {}, mode = \"story_documentary\") {",
helper + "\nfunction convertBeatToNarration(topic = \"\", beat = {}, mode = \"story_documentary\") {"
);

narrativeCode = narrativeCode.replace(
"  return line;",
"  return humanizeNarration(line, cleanTopic);"
);

fs.writeFileSync(narrativePath, narrativeCode);
console.log("✅ Human narration layer added");
}

if (!realizerCode.includes("function humanizeDocumentaryBlock")) {

const helper = `
function humanizeDocumentaryBlock(text = "", topic = "") {
  let value = String(text || "").trim();

  if (!value) return "";

  value = value
    .replace(/\\bcase file\\b/gi, "investigation records")
    .replace(/\\btimeline gap\\b/gi, "timeline me chhupa hua gap")
    .replace(/\\bevidence mismatch\\b/gi, "evidence aur statements ka mismatch")
    .replace(/\\bfinancial records\\b/gi, "financial documents")
    .replace(/\\s+/g, " ")
    .trim();

  return value;
}

function buildHumanLesson(topic = "", narrative = {}) {
  const mode = narrative.narrative_mode || "";

  if (mode === "investigation_documentary") {
    return "Investigation me chhoti inconsistencies hi aksar sabse bade clues ban jaati hain.";
  }

  if (mode === "risk_breakdown") {
    return "Financial decisions me risk ko ignore karna sabse mehngi galti sabit ho sakta hai.";
  }

  if (mode === "record_based_mystery") {
    return "Purane records kabhi kabhi popular kahaniyon se zyada sach bolte hain.";
  }

  return "";
}
`;

realizerCode = realizerCode.replace(
"function realizeDocumentaryStory(context = {}) {",
helper + "\nfunction realizeDocumentaryStory(context = {}) {"
);

realizerCode = realizerCode.replace(
`  return {
    hook: blocks.documentary_hook || "",`,
`  const customLesson = buildHumanLesson(
    context.topic || "",
    narrative
  );

  return {
    hook: humanizeDocumentaryBlock(blocks.documentary_hook || "", context.topic || ""),`
);

realizerCode = realizerCode.replace(
`    setup: blocks.documentary_setup || "",
    conflict: blocks.documentary_conflict || "",
    clue: blocks.documentary_evidence || "",
    escalation: blocks.documentary_turn || "",
    twist: blocks.documentary_turn || "",`,
`    setup: humanizeDocumentaryBlock(blocks.documentary_setup || "", context.topic || ""),
    conflict: humanizeDocumentaryBlock(blocks.documentary_conflict || "", context.topic || ""),
    clue: humanizeDocumentaryBlock(blocks.documentary_evidence || "", context.topic || ""),
    escalation: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),
    twist: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),`
);

realizerCode = realizerCode.replace(
`    lesson: avoidDuplicatePhrase(blocks.documentary_takeaway || buildEndingFormula(context, context.display_topic || context.topic || "ye kahani"))`,
`    lesson: customLesson || avoidDuplicatePhrase(blocks.documentary_takeaway || buildEndingFormula(context, context.display_topic || context.topic || "ye kahani"))`
);

fs.writeFileSync(realizerPath, realizerCode);
console.log("✅ Documentary humanization layer added");
}
