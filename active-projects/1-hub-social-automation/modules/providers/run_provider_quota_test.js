const {
  countDailyUsage,
  getProviderQuotaStatus
} = require("./quota/provider_quota_tracker");

function main() {
  const dailyGeminiUsage = countDailyUsage({
    providerId: "gemini"
  });

  const geminiQuota = getProviderQuotaStatus("gemini");

  console.log(JSON.stringify({
    success: true,
    dailyGeminiUsage,
    geminiQuota
  }, null, 2));
}

main();
