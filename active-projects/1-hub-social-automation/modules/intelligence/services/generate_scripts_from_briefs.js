const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { generateScriptsFromBriefs } = require("../core/script_generator_from_brief");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const briefsPath = path.join(outputDir, "script_briefs.json");
const outputPath = path.join(outputDir, "generated_unraaz_scripts.json");

fs.mkdirSync(outputDir, { recursive: true });

if (!fs.existsSync(briefsPath)) {
  console.log("ℹ️ Script briefs missing. Generating first...");
  execSync("node modules/intelligence/services/build_script_briefs.js", {
    stdio: "inherit"
  });
}

const briefReport = JSON.parse(fs.readFileSync(briefsPath, "utf8"));
const scripts = generateScriptsFromBriefs(briefReport.briefs || []);

const report = {
  generated_at: new Date().toISOString(),
  channel: "UNRAAZ",
  source_file: briefsPath,
  total_scripts: scripts.length,
  scripts
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ Scripts generated from intelligence briefs");
console.log(outputPath);
