const {
  buildProviderUsageSummary,
  saveProviderUsageSummary
} = require("./analytics/provider_usage_summary");

function main() {
  const summary = buildProviderUsageSummary();
  const outputPath = saveProviderUsageSummary(summary);

  console.log(JSON.stringify({
    success: true,
    outputPath,
    totals: summary.totals,
    providers: Object.keys(summary.byProvider),
    types: Object.keys(summary.byType)
  }, null, 2));
}

main();
