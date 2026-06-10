const fs = require("fs");
const path = require("path");

const {
  calculateHealthForProviders
} = require("./health/provider_health_monitor");

const providerIds = [
  "gemini",
  "openai",
  "claude",
  "cloudflare",
  "google",
  "fal",
  "cloudflare_tts",
  "openai_tts",
  "elevenlabs",
  "fal_video",
  "runway"
];

const outputPath = path.join(
  process.cwd(),
  "modules/providers/output/provider_health_summary.json"
);

const summary = {
  generatedAt: new Date().toISOString(),
  providers: calculateHealthForProviders(providerIds)
};

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true
});

fs.writeFileSync(
  outputPath,
  JSON.stringify(summary, null, 2)
);

console.log(
  JSON.stringify(
    {
      success: true,
      providerCount: summary.providers.length,
      outputPath
    },
    null,
    2
  )
);
