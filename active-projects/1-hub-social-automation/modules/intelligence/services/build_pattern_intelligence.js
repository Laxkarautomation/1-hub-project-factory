const fs = require("fs");
const path = require("path");

const { summarizePatterns } =
require("../core/pattern_extractor");

const { rankCompetitors } =
require("../core/competitor_ranker");

const { buildStoryFormulas } =
require("../core/story_formula_builder");

const reportPath = path.join(
  process.cwd(),
  "modules/intelligence/output/pattern_intelligence_report.json"
);

const inputPath = path.join(
  process.cwd(),
  "storage/exports/normalized/relevant_competitor_videos.json"
);

fs.mkdirSync(
  path.dirname(reportPath),
  { recursive: true }
);

const videos = JSON.parse(
  fs.readFileSync(inputPath,"utf8")
);

const report = {
  generated_at: new Date().toISOString(),

  top_patterns:
    summarizePatterns(videos),

  top_competitors:
    rankCompetitors(videos),

  story_formulas:
    buildStoryFormulas(videos)
};

fs.writeFileSync(
  reportPath,
  JSON.stringify(report,null,2)
);

console.log(
  "✅ Pattern intelligence generated"
);

console.log(reportPath);
