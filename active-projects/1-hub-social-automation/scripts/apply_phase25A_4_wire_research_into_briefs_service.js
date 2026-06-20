const fs = require("fs");

const target = "modules/intelligence/services/build_script_briefs.js";
let code = fs.readFileSync(target, "utf8");

if (!code.includes("researchContextsPath")) {
  code = code.replace(
`const outputPath = path.join(outputDir, "script_briefs.json");`,
`const outputPath = path.join(outputDir, "script_briefs.json");
const researchContextsPath = path.join(outputDir, "research_contexts.json");`
  );

  code = code.replace(
`const recommendations = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));`,
`if (!fs.existsSync(researchContextsPath)) {
  console.log("ℹ️ Research contexts missing. Generating first...");
  execSync("node modules/intelligence/services/build_research_contexts.js", {
    stdio: "inherit"
  });
}

const recommendations = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));
const researchReport = JSON.parse(fs.readFileSync(researchContextsPath, "utf8"));`
  );

  code = code.replace(
`const briefs = buildScriptBriefs(recommendations.recommended_topics || [], { channel });`,
`const briefs = buildScriptBriefs(recommendations.recommended_topics || [], {
  channel,
  researchContexts: researchReport.contexts || []
});`
  );

  code = code.replace(
`source_file: recommendationPath,`,
`source_file: recommendationPath,
  research_source_file: researchContextsPath,`
  );

  fs.writeFileSync(target, code);
  console.log("✅ Research contexts wired into build_script_briefs service");
} else {
  console.log("ℹ️ Research service wiring already exists");
}
