const { readJson, writeJson, runNode, stageReport } = require("./_stage_utils");

const attempts = [
  runNode("modules/intelligence/services/build_script_briefs.js"),
  runNode("modules/intelligence/services/generate_scripts_from_briefs.js"),
  runNode("modules/scripts/services/generate_research_scripts.js"),
  runNode("modules/scripts/services/generate_smart_scripts.js")
];

const generated = readJson("modules/intelligence/output/generated_unraaz_scripts.json", null);
const researchScripts = readJson("modules/scripts/output/unraaz_research_scripts.json", null);
const smartScripts = readJson("modules/scripts/output/unraaz_smart_scripts.json", null);

const briefs = readJson(
  "modules/intelligence/output/script_briefs.json",
  {}
);

const briefList = Array.isArray(briefs.briefs)
  ? briefs.briefs
  : [];

const missingSceneBeats = briefList.some(
  brief =>
    !brief.documentary_script ||
    !Array.isArray(brief.documentary_script.scene_beats) ||
    brief.documentary_script.scene_beats.length === 0
);

if (!briefList.length || missingSceneBeats) {
  const report = stageReport("script_generation", {
    success: false,
    failureReason: "missing_documentary_scene_beats",
    totalBriefs: briefList.length
  });

  writeJson(
    "storage/reports/content-workflow/script_generation_stage_report.json",
    report
  );

  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}


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
