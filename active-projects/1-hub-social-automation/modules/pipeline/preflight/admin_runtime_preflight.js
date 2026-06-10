const { resolveRuntimeConfig } = require("../../admin/runtime/runtime_config_resolver");
const { createProviderRuntime } = require("../../providers/admin/admin_provider_runtime_adapter");

const REQUIRED_SERVICES = ["llm", "tts", "image", "video"];

function runAdminRuntimePreflight() {
  const runtimeConfig = resolveRuntimeConfig();

  const result = {
    success: true,
    phase: "11-admin-runtime-pipeline-preflight",
    checks: {
      adminRuntime: runtimeConfig.success,
      activeChannel: !!runtimeConfig.activeChannelId,
      validation: runtimeConfig.validation,
      services: {}
    },
    activeChannelId: runtimeConfig.activeChannelId || null,
    errors: [],
    warnings: []
  };

  if (!runtimeConfig.success) {
    result.success = false;
    result.errors.push("Admin runtime config validation failed.");
  }

  if (!runtimeConfig.activeChannelId) {
    result.success = false;
    result.errors.push("No active channel found.");
  }

  if (
    runtimeConfig.validation &&
    Array.isArray(runtimeConfig.validation.warnings)
  ) {
    result.warnings.push(...runtimeConfig.validation.warnings);
  }

  for (const serviceName of REQUIRED_SERVICES) {
    const providerRuntime = createProviderRuntime(serviceName);

    const serviceCheck = {
      success: providerRuntime.success,
      activeProvider: providerRuntime.activeProvider || null,
      executionOrder: providerRuntime.executionOrder || [],
      hasExecutionOrder:
        Array.isArray(providerRuntime.executionOrder) &&
        providerRuntime.executionOrder.length > 0
    };

    if (!serviceCheck.success) {
      result.success = false;
      result.errors.push(`Provider runtime failed for service: ${serviceName}`);
    }

    if (!serviceCheck.hasExecutionOrder) {
      result.success = false;
      result.errors.push(`No provider execution order found for service: ${serviceName}`);
    }

    result.checks.services[serviceName] = serviceCheck;
  }

  return result;
}

module.exports = { runAdminRuntimePreflight };
