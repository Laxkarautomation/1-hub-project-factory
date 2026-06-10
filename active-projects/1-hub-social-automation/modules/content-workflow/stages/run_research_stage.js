const { readJson, writeJson, runNode, stageReport } = require("./_stage_utils");

const attempts = [
  runNode("modules/research/services/extract_research_notes.js"),
  runNode("modules/intelligence/services/build_script_briefs.js")
];

const notes = readJson("modules/research/output/research_notes.json", null);
const briefs = readJson("modules/intelligence/output/script_briefs.json", null);

const report = stageReport("research", {
  success: true,
  attempts,
  outputs: {
    researchNotes: Boolean(notes),
    scriptBriefs: Boolean(briefs),
    researchNotesPath: "modules/research/output/research_notes.json",
    scriptBriefsPath: "modules/intelligence/output/script_briefs.json"
  }
});

writeJson("storage/reports/content-workflow/research_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));
