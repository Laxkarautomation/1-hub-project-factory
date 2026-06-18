const fs = require("fs");

const briefPath = "modules/intelligence/core/script_brief_builder.js";

let code = fs.readFileSync(briefPath, "utf8");

if (!code.includes("function buildStorySkeleton")) {
  code = code.replace(
`function buildScriptBriefs(recommendations = [], options = {}) {`,
`function buildStorySkeleton(topic, channel = {}) {
  const cleanTopic = normalizeTopic(topic);
  const pillars = toList(channel.contentPillars);
  const keywords = toList(channel.topicKeywords);
  const mode = channel.contentMode || "story";

  const setting = keywords[0] || cleanTopic;
  const conflict = pillars[0] || "hidden problem";
  const clue = keywords[1] || "small detail";
  const twist = pillars[1] || "unexpected reveal";

  return {
    setting: \`\${cleanTopic} starts with a normal situation around \${setting}\`,
    conflict: \`The situation becomes serious when \${conflict} appears\`,
    clue: \`A small clue around \${clue} changes the direction\`,
    twist: \`The final turn connects back to \${twist}\`,
    takeaway: \`The audience should remember the main warning behind this \${mode}\`
  };
}

function buildScriptBriefs(recommendations = [], options = {}) {`
  );

  code = code.replace(
`      scene_plan: buildScenePlan(topic, formula, channel),`,
`      story_skeleton: buildStorySkeleton(topic, channel),
      scene_plan: buildScenePlan(topic, formula, channel),`
  );

  code = code.replace(
`  buildScenePlan
};`,
`  buildScenePlan,
  buildStorySkeleton
};`
  );
}

fs.writeFileSync(briefPath, code);

console.log("✅ Phase 24.9 story skeleton added to script briefs");
