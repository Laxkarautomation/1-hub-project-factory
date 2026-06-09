const fs = require("fs");
const path = require("path");
const { executeProvider } = require("./core/provider_resolver");

const outputDir = path.join(process.cwd(), "modules/providers/output");
const outputPath = path.join(outputDir, "provider_execution_preflight.json");

fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const types = ["script", "image", "audio", "video"];
  const results = [];

  for (const type of types) {
    const result = await executeProvider(
      type,
      {
        source: "provider_execution_preflight",
        timestamp: new Date().toISOString()
      },
      { dryRun: true }
    );

    results.push({
      type,
      success: result.success,
      dryRun: result.dryRun,
      providerNames: result.providerNames
    });

    console.log(`[${type}] ${result.providerNames.join(" -> ")} ✅`);
  }

  const report = {
    generated_at: new Date().toISOString(),
    status: results.every(item => item.success) ? "success" : "failed",
    results
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  if (report.status !== "success") {
    console.error(`Provider execution preflight failed: ${outputPath}`);
    process.exit(1);
  }

  console.log(`\n✅ Provider execution preflight complete`);
  console.log(`Report: ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
