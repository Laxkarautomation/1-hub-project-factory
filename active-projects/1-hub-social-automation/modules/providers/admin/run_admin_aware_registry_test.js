const {
  getAdminAwareProviderRegistry,
  getProviderExecutionOrder,
  getActiveProviderName,
  getProviderConfig
} = require("./admin_aware_provider_registry");

function main() {
  const services = ["llm", "tts", "image", "video"];

  const output = {
    success: true,
    phase: "11-admin-aware-provider-registry-test",
    services: {}
  };

  for (const serviceName of services) {
    const activeProvider = getActiveProviderName(serviceName);

    output.services[serviceName] = {
      activeProvider,
      executionOrder: getProviderExecutionOrder(serviceName),
      activeProviderConfig: activeProvider
        ? getProviderConfig(serviceName, activeProvider)
        : null,
      registry: getAdminAwareProviderRegistry(serviceName)
    };
  }

  console.log(JSON.stringify(output, null, 2));
}

try {
  main();
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));

  process.exitCode = 1;
}
