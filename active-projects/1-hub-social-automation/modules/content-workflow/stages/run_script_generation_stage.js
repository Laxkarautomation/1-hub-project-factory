const { readJson, writeJson, runNode, stageReport } = require("./_stage_utils");

const attempts = [
  runNode("modules/intelligence/services/generate_scripts_from_briefs.js"),
  runNode("modules/scripts/services/generate_research_scripts.js"),
  runNode("modules/scripts/services/generate_smart_scripts.js")
];

const generated = readJson("modules/intelligence/output/generated_unraaz_scripts.json", null);
const researchScripts = readJson("modules/scripts/output/unraaz_research_scripts.json", null);
const smartScripts = readJson("modules/scripts/output/unraaz_smart_scripts.json", null);

const report = stageReport("script_generation", {
  success: true,
  attempts,
  outputs: {
    generatedUnraazScripts: Boolean(generated),
    researchScripts: Boolean(researchScripts),
    smartScripts: Boolean(smartScripts)
  }
});

writeJson("storage/reports/content-workflow/script_generation_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));
