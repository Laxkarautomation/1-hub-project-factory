const fs = require("fs");
const path = require("path");
const { buildProviderSummary } = require("./services/build_provider_summary");

const result = buildProviderSummary();

const outputPath = path.join(
  process.cwd(),
  "modules/providers/output/provider_summary.json"
);

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`Provider summary saved: ${outputPath}`);
console.table(result.summary.map(x => ({
  type: x.type,
  healthy: x.healthy,
  active_provider: x.active_provider,
  state: x.state
})));
