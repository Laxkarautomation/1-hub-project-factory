const fs = require("fs");
const path = require("path");
const {
  buildProviderDashboardData
} = require("./dashboard/provider_dashboard_data");

const outputPath = path.join(
  process.cwd(),
  "modules/providers/output/provider_dashboard_data.json"
);

function main() {
  const dashboard = buildProviderDashboardData();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));

  console.log(JSON.stringify({
    success: true,
    outputPath,
    totals: dashboard.totals
  }, null, 2));
}

main();
