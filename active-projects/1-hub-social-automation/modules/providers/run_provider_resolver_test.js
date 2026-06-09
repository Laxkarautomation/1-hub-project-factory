const { executeProvider, resolveProviders } = require("./core/provider_resolver");

async function main() {
  const types = ["script", "image", "audio", "video"];

  for (const type of types) {
    const resolved = resolveProviders(type);

    console.log(`\n[${type}]`);
    console.log("providers:", resolved.providerNames.join(" -> "));

    const dryRun = await executeProvider(
      type,
      { test: true, source: "provider_resolver_test" },
      { dryRun: true }
    );

    console.log("dryRun:", dryRun.success ? "ok" : "failed");
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
