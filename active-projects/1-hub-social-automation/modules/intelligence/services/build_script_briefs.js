const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { buildScriptBriefs } = require("../core/script_brief_builder");
const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const channelIdentity = getActiveChannelIdentity();
const recommendationPath = path.join(outputDir, `${channelIdentity.channelId}_recommendations.json`);
const outputPath = path.join(outputDir, "script_briefs.json");

fs.mkdirSync(outputDir, { recursive: true });

if (!fs.existsSync(recommendationPath)) {
  console.log("ℹ️ Recommendations missing. Please generate recommendations first.");
  process.exit(1);
}

const recommendations = JSON.parse(fs.readFileSync(recommendationPath, "utf8"));
const runtimeResult = resolveChannelRuntime();
const channel = runtimeResult.success ? runtimeResult.channel : {};

const briefs = buildScriptBriefs(recommendations.recommended_topics || [], { channel });

const report = {
  generated_at: new Date().toISOString(),
  channel: recommendations.channel || recommendations.channelId || "active_channel",
  source_file: recommendationPath,
  channelId: channel.channelId || recommendations.channelId || "active_channel",
  channel_strategy: {
    contentMode: channel.contentMode || "",
    contentCategories: channel.contentCategories || [],
    contentPillars: channel.contentPillars || [],
    topicKeywords: channel.topicKeywords || [],
    storyFormulas: channel.storyFormulas || [],
    hookStyles: channel.hookStyles || [],
    visualStyle: channel.visualStyle || "",
    targetAudience: channel.targetAudience || ""
  },
  total_briefs: briefs.length,
  briefs
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ Script briefs generated");
console.log(outputPath);
