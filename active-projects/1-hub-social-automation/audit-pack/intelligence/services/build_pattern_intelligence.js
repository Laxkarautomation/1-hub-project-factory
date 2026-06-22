const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const { summarizePatterns } = require("../core/pattern_extractor");
const { rankCompetitors } = require("../core/competitor_ranker");
const { buildStoryFormulas } = require("../core/story_formula_builder");

const outputPath = path.join(
  process.cwd(),
  "modules/intelligence/output/pattern_intelligence_report.json"
);

const qualityReportPath = path.join(
  process.cwd(),
  "modules/intelligence/output/competitor_intelligence_report.json"
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

if (!fs.existsSync(qualityReportPath)) {
  console.log("ℹ️ Quality intelligence report missing. Generating it first...");
  execSync("node modules/intelligence/services/build_competitor_intelligence.js", {
    stdio: "inherit"
  });
}

const qualityReport = JSON.parse(fs.readFileSync(qualityReportPath, "utf8"));
const videos = qualityReport.top_trending_videos || [];

const report = {
  generated_at: new Date().toISOString(),
  source_report: qualityReportPath,
  total_videos_analyzed: videos.length,
  top_patterns: summarizePatterns(videos),
  top_competitors: rankCompetitors(videos),
  story_formulas: buildStoryFormulas(videos)
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ Pattern intelligence generated");
console.log(outputPath);
