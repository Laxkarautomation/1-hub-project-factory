const fs = require("fs");
const path = require("path");

const { getProviderStack } = require("./core/provider_loader");
const { runFallbackStack } = require("./core/fallback_engine");

const { getScriptProviders } = require("./registry/script_provider_registry");
const { getImageProviders } = require("./registry/image_provider_registry");
const { getAudioProviders } = require("./registry/audio_provider_registry");
const { getVideoProviders } = require("./registry/video_provider_registry");

async function check(type, getProviders, payload) {
  const stack = getProviderStack(type);
  const providers = getProviders(stack.fallbacks);

  return runFallbackStack({
    type,
    providers,
    payload
  });
}

async function main() {
  const results = {
    checked_at: new Date().toISOString(),
    status: {}
  };

  results.status.script = await check("script", getScriptProviders, {
    topic: "haunted village mystery"
  });

  results.status.image = await check("image", getImageProviders, {
    prompt: "dark cinematic Indian village mystery scene"
  });

  results.status.audio = await check("audio", getAudioProviders, {
    text: "Ye ek rahasya ki kahani hai."
  });

  results.status.video = await check("video", getVideoProviders, {
    script_id: "research_script_001"
  });

  const outputDir = path.join(process.cwd(), "modules/providers/output");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "provider_health_status.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`Provider health saved: ${outputPath}`);
  console.log(JSON.stringify(results, null, 2));
}

main();
