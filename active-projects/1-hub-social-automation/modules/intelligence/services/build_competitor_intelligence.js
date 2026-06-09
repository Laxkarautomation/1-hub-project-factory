const fs = require("fs");
const path = require("path");

const { scoreVideo } = require("../core/trend_scorer");
const { extractHooks, buildHookSummary } = require("../core/hook_extractor");
const { findContentGaps } = require("../core/content_gap_finder");

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

  const scoredVideos = videos
    .map(video => {
      const scored = scoreVideo(video);
      return {
        ...scored,
        hooks: extractHooks(scored.title || "")
      };
    })
    .sort((a, b) => b.trend_score - a.trend_score);

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
      trend_signals: video.trend_signals,
      hooks: video.hooks
    })),
    hook_summary: buildHookSummary(scoredVideos),
    content_gaps: findContentGaps(scoredVideos)
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("✅ Competitor intelligence report created:");
  console.log(outputPath);
  console.log(`Total analyzed: ${report.total_videos_analyzed}`);
}

run();
