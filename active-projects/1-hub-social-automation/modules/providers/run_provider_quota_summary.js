const fs = require("fs");
const path = require("path");
const { getAllProviderQuotaStatus } = require("./quota/provider_quota_tracker");

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
  "modules/providers/output/provider_quota_summary.json"
);

function main() {
  const summary = {
    generatedAt: new Date().toISOString(),
    providers: getAllProviderQuotaStatus(providerIds)
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  console.log(JSON.stringify({
    success: true,
    outputPath,
    providerCount: summary.providers.length
  }, null, 2));
}

main();
