const { readJson, writeJson, runNode, stageReport } = require("./_stage_utils");

const attempts = [
  runNode("modules/intelligence/services/build_competitor_intelligence.js")
];

const intelligence = readJson("modules/intelligence/output/competitor_intelligence_report.json", null);
const normalizedYoutube = readJson("storage/exports/normalized/youtube_competitor_content.json", []);
const relevantVideos = readJson("storage/exports/normalized/relevant_competitor_videos.json", []);

const report = stageReport("competitor_tracking", {
  success: true,
  attempts,
  inputs: {
    normalizedYoutubeItems: Array.isArray(normalizedYoutube) ? normalizedYoutube.length : 0,
    relevantVideos: Array.isArray(relevantVideos) ? relevantVideos.length : 0
  },
  outputs: {
    competitorIntelligenceReport: Boolean(intelligence),
    path: "modules/intelligence/output/competitor_intelligence_report.json"
  }
});

writeJson("storage/reports/content-workflow/competitor_tracking_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));
