const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  buildRecommendedTopics,
  buildHookSuggestions,
  buildTitleSuggestions
} = require("../core/recommendation_builder");

const outputDir = path.join(process.cwd(), "modules/intelligence/output");
const outputPath = path.join(outputDir, "unraaz_recommendations.json");

const competitorReportPath = path.join(outputDir, "competitor_intelligence_report.json");
const patternReportPath = path.join(outputDir, "pattern_intelligence_report.json");

fs.mkdirSync(outputDir, { recursive: true });

function ensureReport(filePath, command) {
  if (!fs.existsSync(filePath)) {
    execSync(command, { stdio: "inherit" });
  }
}

ensureReport(
  competitorReportPath,
  "node modules/intelligence/services/build_competitor_intelligence.js"
);

ensureReport(
  patternReportPath,
  "node modules/intelligence/services/build_pattern_intelligence.js"
);

const competitorReport = JSON.parse(fs.readFileSync(competitorReportPath, "utf8"));
const patternReport = JSON.parse(fs.readFileSync(patternReportPath, "utf8"));

const recommendedTopics = buildRecommendedTopics({
  patterns: patternReport.top_patterns || [],
  gaps: competitorReport.content_gaps || [],
  formulas: patternReport.story_formulas || []
});

const report = {
  generated_at: new Date().toISOString(),
  channel: "UNRAAZ",
  strategy_summary: {
    strongest_patterns: patternReport.top_patterns || [],
    strongest_competitors: patternReport.top_competitors || [],
    best_story_formulas: patternReport.story_formulas || []
  },
  recommended_topics: recommendedTopics,
  hook_suggestions: buildHookSuggestions(patternReport.top_patterns || []),
  title_suggestions: buildTitleSuggestions(recommendedTopics),
  next_action: "Use top recommended topic to generate script brief."
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("✅ UNRAAZ recommendations generated");
console.log(outputPath);
