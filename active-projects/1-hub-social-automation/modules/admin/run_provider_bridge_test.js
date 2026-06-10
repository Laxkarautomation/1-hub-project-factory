const {
  getAdminProviderRuntime,
  getAdminProviderFallbackOrder,
  getAdminActiveProvider,
  buildProviderExecutionPlan
} = require("./providers/admin_provider_bridge");

async function main() {
  const services = ["llm", "tts", "image", "video"];

  const output = {
    success: true,
    phase: "11-provider-config-bridge-test",
    services: {}
  };

  for (const service of services) {
    output.services[service] = {
      runtime: getAdminProviderRuntime(service),
      fallbackOrder: getAdminProviderFallbackOrder(service),
      activeProvider: getAdminActiveProvider(service),
      executionPlan: buildProviderExecutionPlan(service)
    };
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));

  process.exitCode = 1;
});
