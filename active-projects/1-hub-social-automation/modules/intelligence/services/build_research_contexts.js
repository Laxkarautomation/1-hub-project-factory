const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { buildResearchContext } = require("../core/research_context_builder");
const { getActiveChannelIdentity } = require("../../channels/channel_identity_helper");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const channelIdentity = getActiveChannelIdentity();
const recommendationPath = path.join(outputDir, `${channelIdentity.channelId}_recommendations.json`);
const outputPath = path.join(outputDir, "research_contexts.json");

fs.mkdirSync(outputDir, { recursive: true });

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(recommendationPath)) {
  console.log("ℹ️ Recommendations missing. Generating first...");
  execSync("node modules/intelligence/services/build_unraaz_recommendations.js", {
    stdio: "inherit"
  });
}

const recommendations = readJson(recommendationPath, {});
const runtimeResult = resolveChannelRuntime();
const channel = runtimeResult.success ? runtimeResult.channel : {};

const recommendedTopics = recommendations.recommended_topics || [];

const researchContexts = recommendedTopics.map((item, index) => {
  const topic = item.topic || item.title || item.keyword || `topic_${index + 1}`;

  return {
    rank: item.rank || index + 1,
    topic,
    source_recommendation: item,
    research_context: buildResearchContext(topic, channel, {
      generationMode: "offline_recommendation_research_foundation"
    })
  };
});

const report = {
  generated_at: new Date().toISOString(),
  channel: recommendations.channel || channel.name || channelIdentity.channelId,
  channelId: channel.channelId || recommendations.channelId || channelIdentity.channelId,
  source_file: recommendationPath,
  total_contexts: researchContexts.length,
  research_strategy: {
    mode: "offline_inferred_foundation",
    purpose: "Convert recommended topics into structured research context before script brief generation",
    safety: "Inferred research points must not be treated as verified facts until external/source verification is added"
  },
  contexts: researchContexts
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ Research contexts generated");
console.log(outputPath);
console.log(`Total contexts: ${report.total_contexts}`);
