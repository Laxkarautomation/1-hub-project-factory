const { runWithAdminAwareProviders } = require("./runtime/admin_aware_provider_runner");
const { mockHandlers } = require("./runtime/mock_provider_handlers");

async function main() {
  const services = ["llm", "tts", "image", "video"];

  const output = {
    success: true,
    phase: "11-existing-provider-runners-admin-aware-test",
    results: {}
  };

  for (const serviceName of services) {
    const result = await runWithAdminAwareProviders(
      serviceName,
      mockHandlers,
      {
        test: true,
        prompt: `Testing ${serviceName} admin-aware provider runner`
      }
    );

    output.results[serviceName] = result;

    if (!result.success) {
      output.success = false;
    }
  }

  console.log(JSON.stringify(output, null, 2));

  if (!output.success) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));

  process.exitCode = 1;
});
