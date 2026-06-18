const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { generateScriptsFromBriefs } = require("../core/script_generator_from_brief");
const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const briefsPath = path.join(outputDir, "script_briefs.json");
const channelIdentity = getActiveChannelIdentity();
const outputPath = path.join(outputDir, `generated_${channelIdentity.channelId}_scripts.json`);

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
  channel: briefReport.channel || channelIdentity.channelId,
  channelId: briefReport.channelId || channelIdentity.channelId,
  source_file: briefsPath,
  total_scripts: scripts.length,
  scripts
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ Scripts generated from intelligence briefs");
console.log(outputPath);
