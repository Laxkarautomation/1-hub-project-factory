const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { buildScriptBriefs } = require("../core/script_brief_builder");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const recommendationPath = path.join(outputDir, "unraaz_recommendations.json");
const outputPath = path.join(outputDir, "script_briefs.json");

fs.mkdirSync(outputDir, { recursive: true });

if (!fs.existsSync(recommendationPath)) {
  console.log("ℹ️ UNRAAZ recommendations missing. Generating first...");
  execSync("node modules/intelligence/services/build_unraaz_recommendations.js", {
    stdio: "inherit"
  });
}

const recommendations = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));

const briefs = buildScriptBriefs(recommendations.recommended_topics || []);

const report = {
  generated_at: new Date().toISOString(),
  channel: "UNRAAZ",
  source_file: recommendationPath,
  total_briefs: briefs.length,
  briefs
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ Script briefs generated");
console.log(outputPath);
