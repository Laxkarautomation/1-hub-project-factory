const { buildProviderExecutionPlan } = require("./admin_provider_bridge");

async function executeWithAdminFallback(serviceName, handlers, payload = {}) {
  const plan = buildProviderExecutionPlan(serviceName);

  if (!plan.success) {
    return {
      success: false,
      serviceName,
      error: plan.error,
      attempts: []
    };
  }

  const attempts = [];

  for (const provider of plan.executionPlan) {
    const handler = handlers[provider.name];

    if (typeof handler !== "function") {
      attempts.push({
        provider: provider.name,
        success: false,
        skipped: true,
        error: "No handler registered for provider"
      });
      continue;
    }

    try {
      const result = await handler({
        provider,
        payload,
        serviceName
      });

      attempts.push({
        provider: provider.name,
        success: !!(result && result.success),
        skipped: false,
        error: result && result.error ? result.error : null
      });

      if (result && result.success) {
        return {
          success: true,
          serviceName,
          provider: provider.name,
          result,
          attempts
        };
      }
    } catch (error) {
      attempts.push({
        provider: provider.name,
        success: false,
        skipped: false,
        error: error.message
      });
    }
  }

  return {
    success: false,
    serviceName,
    error: "All admin-configured providers failed",
    attempts
  };
}

module.exports = { executeWithAdminFallback };
