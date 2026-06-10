const { createProviderRuntime } = require("./admin_provider_runtime_adapter");

function main() {
  const services = ["llm", "tts", "image", "video"];

  const output = {
    success: true,
    phase: "11-admin-provider-runtime-adapter-test",
    runtimes: {}
  };

  for (const serviceName of services) {
    const runtime = createProviderRuntime(serviceName);

    output.runtimes[serviceName] = {
      success: runtime.success,
      serviceName: runtime.serviceName,
      activeProvider: runtime.activeProvider,
      executionOrder: runtime.executionOrder,
      activeProviderConfig: runtime.getActiveProvider(),
      fallbackProviders: runtime.getFallbackProviders()
    };

    if (!runtime.success) {
      output.success = false;
    }
  }

  console.log(JSON.stringify(output, null, 2));

  if (!output.success) {
    process.exitCode = 1;
  }
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
