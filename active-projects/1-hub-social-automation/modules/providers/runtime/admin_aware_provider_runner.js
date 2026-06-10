const { createProviderRuntime } = require("../admin/admin_provider_runtime_adapter");

async function runWithAdminAwareProviders(serviceName, handlers = {}, payload = {}) {
  const runtime = createProviderRuntime(serviceName);

  if (!runtime.success) {
    return {
      success: false,
      serviceName,
      error: "No admin-aware provider runtime available",
      runtime: {
        activeProvider: runtime.activeProvider,
        executionOrder: runtime.executionOrder
      },
      attempts: []
    };
  }

  const attempts = [];

  for (const providerName of runtime.executionOrder) {
    const providerResult = runtime.getProvider(providerName);

    if (!providerResult.success) {
      attempts.push({
        provider: providerName,
        success: false,
        skipped: true,
        error: providerResult.error
      });
      continue;
    }

    const handler = handlers[providerName];

    if (typeof handler !== "function") {
      attempts.push({
        provider: providerName,
        success: false,
        skipped: true,
        error: "No provider handler registered"
      });
      continue;
    }

    try {
      const result = await handler({
        serviceName,
        providerName,
        providerConfig: providerResult.config,
        payload
      });

      attempts.push({
        provider: providerName,
        success: !!(result && result.success),
        skipped: false,
        error: result && result.error ? result.error : null
      });

      if (result && result.success) {
        return {
          success: true,
          serviceName,
          provider: providerName,
          result,
          attempts
        };
      }
    } catch (error) {
      attempts.push({
        provider: providerName,
        success: false,
        skipped: false,
        error: error.message
      });
    }
  }

  return {
    success: false,
    serviceName,
    error: "All providers failed or no handlers matched admin execution order",
    attempts
  };
}

module.exports = { runWithAdminAwareProviders };
