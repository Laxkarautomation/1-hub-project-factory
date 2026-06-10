const { readUsageLog } = require("./usage/provider_usage_store");
const { trackProviderUsage } = require("./usage/provider_usage_tracker");

function main() {
  const before = readUsageLog();

  const entry = trackProviderUsage({
    provider: "gemini",
    type: "script",
    result: {
      success: false,
      status: "provider_unavailable",
      error: "Test empty-key usage tracking"
    },
    keyId: null,
    model: "test-model",
    durationMs: 12,
    metadata: {
      test: true
    }
  });

  const after = readUsageLog();

  console.log(JSON.stringify({
    success: true,
    beforeCount: before.length,
    afterCount: after.length,
    entry
  }, null, 2));
}

main();
