const { readJson, writeJson, getChannelId, stageReport } = require("./_stage_utils");

const scripts =
  readJson("modules/intelligence/output/generated_unraaz_scripts.json", null) ||
  readJson("modules/scripts/output/unraaz_research_scripts.json", []) ||
  [];

const items = Array.isArray(scripts) ? scripts : (scripts.scripts || scripts.items || []);

const manifest = {
  success: true,
  channelId: getChannelId(),
  providerAware: true,
  adminConfigDriven: true,
  freeFirst: true,
  status: "manifest_created",
  note: "TTS content-stage manifest created. Actual audio generation will use admin-selected audio provider when keys/free provider are available.",
  totalScripts: items.length,
  items: items.map((item, index) => ({
    id: item.id || item.scriptId || `script_${String(index + 1).padStart(3, "0")}`,
    status: "pending_audio_provider",
    textSource: "script_generation",
    outputAudio: null
  })),
  generatedAt: new Date().toISOString()
};

writeJson("storage/workflows/tts_generation_manifest.json", manifest);

const report = stageReport("tts_generation", {
  success: true,
  output: "storage/workflows/tts_generation_manifest.json",
  totalItems: manifest.totalScripts
});

writeJson("storage/reports/content-workflow/tts_generation_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));
