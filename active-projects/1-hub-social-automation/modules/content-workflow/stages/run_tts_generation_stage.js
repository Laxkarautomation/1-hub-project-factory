const fs = require("fs");
const path = require("path");
const { readJson, writeJson, getChannelId, runNode, stageReport, ROOT } = require("./_stage_utils");

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function fileReady(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).size > 1000;
}

function narrationFromScenes(scenes = []) {
  return toArray(scenes)
    .map(scene => scene.narration || scene.text || "")
    .filter(Boolean)
    .join(" ");
}

function expectedAudioPath(scriptId) {
  return path.join(ROOT, "storage/audio", getChannelId(), `${scriptId}.mp3`);
}

function loadVideoManifest() {
  const manifest = readJson("modules/video/output/video_manifest.json", []);
  return Array.isArray(manifest) ? manifest : (manifest.videos || manifest.items || []);
}

const videos = loadVideoManifest();

const manifestItems = videos.map(video => {
  const scriptId = video.script_id || video.scriptId || video.id;
  const outputAudio = video.voice_file || expectedAudioPath(scriptId);
  const text = narrationFromScenes(video.scenes);

  return {
    id: scriptId,
    script_id: scriptId,
    status: fileReady(outputAudio) ? "audio_ready" : "missing_audio",
    textSource: "video_manifest",
    text,
    outputAudio,
    exists: fileReady(outputAudio),
    sizeBytes: fs.existsSync(outputAudio) ? fs.statSync(outputAudio).size : 0
  };
});

const missingAudio = manifestItems.filter(item => !item.exists);

const manifest = {
  success: videos.length > 0 && missingAudio.length === 0,
  channelId: getChannelId(),
  providerAware: true,
  adminConfigDriven: true,
  freeFirst: true,
  status: videos.length === 0
    ? "missing_video_manifest"
    : missingAudio.length
      ? "missing_audio"
      : "audio_ready",
  failureReason: videos.length === 0
    ? "missing_video_manifest"
    : missingAudio.length
      ? "missing_audio_files"
      : null,
  totalScripts: videos.length,
  readyAudio: manifestItems.length - missingAudio.length,
  missingAudio: missingAudio.length,
  items: manifestItems,
  generatedAt: new Date().toISOString()
};

writeJson("storage/workflows/tts_generation_manifest.json", manifest);

const attempts = [
  runNode("providers/edge-tts/services/generate_voice.js")
];

const refreshedItems = manifest.items.map(item => ({
  ...item,
  exists: fileReady(item.outputAudio),
  sizeBytes: fs.existsSync(item.outputAudio) ? fs.statSync(item.outputAudio).size : 0,
  status: fileReady(item.outputAudio) ? "audio_ready" : "missing_audio"
}));

const refreshedMissing = refreshedItems.filter(item => !item.exists);

const finalManifest = {
  ...manifest,
  success: videos.length > 0 && refreshedMissing.length === 0,
  status: videos.length === 0
    ? "missing_video_manifest"
    : refreshedMissing.length
      ? "missing_audio"
      : "audio_ready",
  failureReason: videos.length === 0
    ? "missing_video_manifest"
    : refreshedMissing.length
      ? "missing_audio_files"
      : null,
  readyAudio: refreshedItems.length - refreshedMissing.length,
  missingAudio: refreshedMissing.length,
  items: refreshedItems,
  attempts
};

writeJson("storage/workflows/tts_generation_manifest.json", finalManifest);

const report = stageReport("tts_generation", {
  success: finalManifest.success,
  status: finalManifest.status,
  failureReason: finalManifest.failureReason,
  attempts,
  output: "storage/workflows/tts_generation_manifest.json",
  totalItems: finalManifest.totalScripts,
  readyAudio: finalManifest.readyAudio,
  missingAudio: finalManifest.missingAudio,
  missingAudioItems: refreshedMissing.map(item => ({
    script_id: item.script_id,
    outputAudio: item.outputAudio,
    sizeBytes: item.sizeBytes
  }))
});

writeJson("storage/reports/content-workflow/tts_generation_stage_report.json", report);
console.log(JSON.stringify(report, null, 2));

if (!finalManifest.success) process.exit(1);
