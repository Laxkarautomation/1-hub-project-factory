const fs = require("fs");

const realizerPath = "modules/intelligence/core/story_realizer.js";
const briefPath = "modules/intelligence/core/script_brief_builder.js";
const generatorPath = "modules/intelligence/core/script_generator_from_brief.js";

const realizerCode = `function clean(value = "") {
  return String(value || "").trim();
}

function topicTitle(topic = "") {
  return clean(topic).replace(/_/g, " ").replace(/\\s+/g, " ");
}

function realizeStory(context = {}) {
  const topic = topicTitle(context.topic || "story");
  const location = clean(context.location_context || "ek jagah");
  const tension = clean(context.central_tension || "ek ajeeb problem");
  const detail = clean(context.trigger_detail || "ek chhoti detail");
  const evidence = clean(context.evidence_object || "ek purana record");
  const twist = clean(context.twist_source || "ek purana connection");
  const atmosphere = clean(context.atmosphere || "serious");

  return {
    hook: \`\${topic} me ek aisi baat chhupi thi jise pehle kisi ne seriously nahi liya...\`,
    setup: \`Shuruaat \${location} se hoti hai, jahan sab kuch normal lag raha tha. Lekin mahaul me ek \${atmosphere} feeling dheere dheere banne lagi.\`,
    conflict: \`Phir \${tension} ka angle saamne aaya. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi.\`,
    clue: \`Isi beech \${detail} se judi ek chhoti si information mili. Uske baad \${evidence} par sabki nazar gayi.\`,
    twist: \`Jab ye sab details connect hui, to \${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya.\`,
    lesson: \`\${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.\`
  };
}

module.exports = {
  realizeStory
};
`;

fs.writeFileSync(realizerPath, realizerCode);

let briefCode = fs.readFileSync(briefPath, "utf8");

if (!briefCode.includes("story_realizer")) {
  briefCode = briefCode.replace(
    `const { buildStoryContext } = require("./story_context_builder");`,
    `const { buildStoryContext } = require("./story_context_builder");
const { realizeStory } = require("./story_realizer");`
  );
}

if (!briefCode.includes("story_blocks: realizeStory")) {
  briefCode = briefCode.replace(
    `      story_context: buildStoryContext(topic, channel),
      story_skeleton: buildStorySkeleton(topic, channel),`,
    `      story_context: buildStoryContext(topic, channel),
      story_blocks: realizeStory(buildStoryContext(topic, channel)),
      story_skeleton: buildStorySkeleton(topic, channel),`
  );
}

fs.writeFileSync(briefPath, briefCode);

let generatorCode = fs.readFileSync(generatorPath, "utf8");

if (!generatorCode.includes("function getStoryBlock")) {
  generatorCode = generatorCode.replace(
    `function getSkeletonLine(brief, role) {`,
    `function getStoryBlock(brief, role) {
  const blocks = brief.story_blocks || {};
  const map = {
    intro: blocks.setup,
    escalation: blocks.conflict,
    turn: blocks.clue,
    twist: blocks.twist,
    ending: blocks.lesson
  };

  return cleanText(map[role] || "");
}

function getSkeletonLine(brief, role) {`
  );
}

generatorCode = generatorCode.replace(
  `  const skeletonLine = getSkeletonLine(brief, role);
  const cleanScene = skeletonLine || stripTemplateLanguage(scene, topic);`,
  `  const storyBlock = getStoryBlock(brief, role);
  const skeletonLine = getSkeletonLine(brief, role);
  const cleanScene = storyBlock || skeletonLine || stripTemplateLanguage(scene, topic);`
);

generatorCode = generatorCode.replace(
  `      text: cleanText(brief.opening_hook) || \`\${topic} ki ek story hai jiska twist end tak clear nahi hota...\``,
  `      text: cleanText(brief.story_blocks?.hook) || cleanText(brief.opening_hook) || \`\${topic} ki ek story hai jiska twist end tak clear nahi hota...\``
);

generatorCode = generatorCode.replace(
  `      text: cleanText(brief.ending_lesson) || buildLineFromScene(getScene(brief, 4), "ending", brief)`,
  `      text: cleanText(brief.story_blocks?.lesson) || cleanText(brief.ending_lesson) || buildLineFromScene(getScene(brief, 4), "ending", brief)`
);

fs.writeFileSync(generatorPath, generatorCode);

console.log("✅ Phase 24.11B story realizer applied");
console.log("Created:", realizerPath);
console.log("Updated:", briefPath);
console.log("Updated:", generatorPath);
