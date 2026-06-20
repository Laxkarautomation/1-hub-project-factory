const fs = require("fs");

const target = "modules/intelligence/core/script_brief_builder.js";

let code = fs.readFileSync(target, "utf8");

if (!code.includes("function buildResearchLookup")) {

const injection = `
function buildResearchLookup(researchContexts = []) {
  const lookup = {};

  (researchContexts || []).forEach(item => {
    const topic = String(item.topic || "").trim().toLowerCase();

    if (!topic) return;

    lookup[topic] = item.research_context || {};
  });

  return lookup;
}
`;

code = code.replace(
'function buildScriptBriefs(recommendations = [], options = {}) {',
injection + '\nfunction buildScriptBriefs(recommendations = [], options = {}) {'
);

code = code.replace(
'const channel = options.channel || {};',
`const channel = options.channel || {};
  const researchLookup = buildResearchLookup(
    options.researchContexts || []
  );`
);

code = code.replace(
'return recommendations.map(item => {',
`return recommendations.map(item => {

    const researchContext =
      researchLookup[
        String(item.topic || "").trim().toLowerCase()
      ] || {};`
);

code = code.replace(
`story_formula: formula,`,
`story_formula: formula,
      research_context: researchContext,`
);

fs.writeFileSync(target, code);

console.log("✅ Script Brief Research Integration Added");
}
else {
  console.log("ℹ️ Already integrated");
}
