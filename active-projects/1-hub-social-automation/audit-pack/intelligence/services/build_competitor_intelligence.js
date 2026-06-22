const fs = require("fs");
const path = require("path");

const { scoreVideo } = require("../core/trend_scorer");
const { extractHooks, buildHookSummary } = require("../core/hook_extractor");
const { findContentGaps } = require("../core/content_gap_finder");
const { calculateQuality } = require("../core/quality_filter");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");

const inputPath = path.join(process.cwd(), "storage/exports/normalized/relevant_competitor_videos.json");
const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const outputPath = path.join(outputDir, "competitor_intelligence_report.json");

fs.mkdirSync(outputDir, { recursive: true });

function readJson(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function run() {
  const videos = readJson(inputPath, []);
  const runtimeResult = resolveChannelRuntime();
  const channel = runtimeResult.success ? runtimeResult.channel : {};

  const scoredVideos = videos
    .map(video => {
      const scored = scoreVideo(video);
      const withHooks = {
        ...scored,
        hooks: extractHooks(scored.title || "")
      };

      return calculateQuality(withHooks);
    })
    .sort((a, b) => b.quality_score - a.quality_score);

  const report = {
    generated_at: new Date().toISOString(),
    input_file: inputPath,
    total_videos_analyzed: scoredVideos.length,
    top_trending_videos: scoredVideos.slice(0, 25).map((video, index) => ({
      rank: index + 1,
      source_name: video.source_name,
      title: video.title,
      content_url: video.content_url,
      relevance_score: video.relevance_score,
      trend_score: video.trend_score,
      quality_score: video.quality_score,
      quality_penalty: video.quality_penalty,
      penalty_reasons: video.penalty_reasons,
      quality_boost: video.quality_boost,
      boost_reasons: video.boost_reasons,
      trend_signals: video.trend_signals,
      hooks: video.hooks
    })),
    channel: channel.name || channel.channelId || "active_channel",
    channelId: channel.channelId || "active_channel",
    channel_strategy: {
      niche: channel.niche || "",
      contentMode: channel.contentMode || "",
      contentCategories: channel.contentCategories || [],
      blockedCategories: channel.blockedCategories || [],
      contentPillars: channel.contentPillars || [],
      topicKeywords: channel.topicKeywords || [],
      blockedKeywords: channel.blockedKeywords || [],
      storyFormulas: channel.storyFormulas || [],
      hookStyles: channel.hookStyles || [],
      visualStyle: channel.visualStyle || "",
      targetAudience: channel.targetAudience || ""
    },
    hook_summary: buildHookSummary(scoredVideos),
    content_gaps: findContentGaps(scoredVideos, { channel })
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("✅ Competitor intelligence report created:");
  console.log(outputPath);
  console.log(`Total analyzed: ${report.total_videos_analyzed}`);
}

run();
