const { resolveRuntimeConfig } = require("../runtime/runtime_config_resolver");

function getAdminProviderRuntime(serviceName) {
  const runtime = resolveRuntimeConfig();

  const service = runtime.services && runtime.services[serviceName];

  if (!service || !service.found) {
    return {
      success: false,
      serviceName,
      error: `Service not found in admin config: ${serviceName}`,
      activeProvider: null,
      fallbackOrder: [],
      providers: {}
    };
  }

  return {
    success: true,
    serviceName,
    activeProvider: service.active,
    fallbackOrder: service.fallbackOrder || [],
    provider: service.provider || null,
    validation: runtime.validation
  };
}

function getAdminProviderFallbackOrder(serviceName) {
  const runtime = getAdminProviderRuntime(serviceName);

  if (!runtime.success) return [];

  return runtime.fallbackOrder;
}

function getAdminActiveProvider(serviceName) {
  const runtime = getAdminProviderRuntime(serviceName);

  if (!runtime.success) return null;

  return runtime.provider;
}

function buildProviderExecutionPlan(serviceName) {
  const runtime = resolveRuntimeConfig();

  const rawService =
    runtime.services &&
    runtime.services[serviceName];

  if (!rawService || !rawService.found) {
    return {
      success: false,
      serviceName,
      error: `No admin provider config found for service: ${serviceName}`,
      executionPlan: []
    };
  }

  const configService = require("../config/admin_config_store").loadAdminConfig()
    .providers[serviceName];

  const executionPlan = [];

  for (const providerName of rawService.fallbackOrder || []) {
    const providerConfig =
      configService.providers &&
      configService.providers[providerName];

    if (!providerConfig) continue;
    if (providerConfig.enabled === false) continue;

    executionPlan.push({
      name: providerName,
      serviceName,
      type: providerConfig.type || "free",
      model: providerConfig.model || null,
      endpoint: providerConfig.endpoint || null,
      apiKeyRef: providerConfig.apiKeyRef || null,
      apiKey: providerConfig.apiKeyRef
        ? process.env[providerConfig.apiKeyRef] || null
        : null,
      dailyLimit: providerConfig.dailyLimit || null,
      raw: providerConfig
    });
  }

  return {
    success: true,
    serviceName,
    activeProvider: rawService.active,
    executionPlan
  };
}

module.exports = {
  getAdminProviderRuntime,
  getAdminProviderFallbackOrder,
  getAdminActiveProvider,
  buildProviderExecutionPlan
};
