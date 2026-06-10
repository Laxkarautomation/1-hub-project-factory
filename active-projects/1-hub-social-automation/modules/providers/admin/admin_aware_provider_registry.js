const path = require("path");
const fs = require("fs");

const {
  buildProviderExecutionPlan,
  getAdminProviderRuntime
} = require("../../admin/providers/admin_provider_bridge");

function safeRequire(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return require(filePath);
  } catch (error) {
    return null;
  }
}

function loadLegacyProviderRegistry() {
  const candidates = [
    path.join(process.cwd(), "modules", "providers", "provider_registry.js"),
    path.join(process.cwd(), "modules", "providers", "registry", "provider_registry.js"),
    path.join(process.cwd(), "modules", "providers", "provider_registry", "index.js")
  ];

  for (const candidate of candidates) {
    const loaded = safeRequire(candidate);
    if (loaded) {
      return {
        found: true,
        path: candidate,
        registry: loaded
      };
    }
  }

  return {
    found: false,
    path: null,
    registry: null
  };
}

function normalizeLegacyProviders(legacyRegistry) {
  if (!legacyRegistry || !legacyRegistry.registry) return {};

  const registry = legacyRegistry.registry;

  if (registry.PROVIDER_REGISTRY && typeof registry.PROVIDER_REGISTRY === "object") {
    return registry.PROVIDER_REGISTRY;
  }

  if (registry.providerRegistry && typeof registry.providerRegistry === "object") {
    return registry.providerRegistry;
  }

  if (registry.providers && typeof registry.providers === "object") {
    return registry.providers;
  }

  if (typeof registry.getProviderRegistry === "function") {
    try {
      return registry.getProviderRegistry();
    } catch (error) {
      return {};
    }
  }

  return {};
}

function getAdminAwareProviderRegistry(serviceName) {
  const adminRuntime = getAdminProviderRuntime(serviceName);
  const adminPlan = buildProviderExecutionPlan(serviceName);
  const legacyRegistry = loadLegacyProviderRegistry();
  const legacyProviders = normalizeLegacyProviders(legacyRegistry);

  return {
    success: adminRuntime.success,
    source: "admin-config-primary",
    serviceName,
    admin: {
      runtime: adminRuntime,
      executionPlan: adminPlan
    },
    legacy: {
      found: legacyRegistry.found,
      path: legacyRegistry.path,
      providers: legacyProviders
    }
  };
}

function getProviderExecutionOrder(serviceName) {
  const registry = getAdminAwareProviderRegistry(serviceName);

  if (
    registry.admin &&
    registry.admin.executionPlan &&
    Array.isArray(registry.admin.executionPlan.executionPlan)
  ) {
    return registry.admin.executionPlan.executionPlan.map((provider) => provider.name);
  }

  return [];
}

function getActiveProviderName(serviceName) {
  const registry = getAdminAwareProviderRegistry(serviceName);

  if (
    registry.admin &&
    registry.admin.runtime &&
    registry.admin.runtime.activeProvider
  ) {
    return registry.admin.runtime.activeProvider;
  }

  return null;
}

function getProviderConfig(serviceName, providerName) {
  const registry = getAdminAwareProviderRegistry(serviceName);

  const plan =
    registry.admin &&
    registry.admin.executionPlan &&
    registry.admin.executionPlan.executionPlan
      ? registry.admin.executionPlan.executionPlan
      : [];

  const found = plan.find((provider) => provider.name === providerName);

  if (found) {
    return {
      success: true,
      source: "admin-config",
      serviceName,
      providerName,
      config: found
    };
  }

  const legacyProviders =
    registry.legacy && registry.legacy.providers
      ? registry.legacy.providers
      : {};

  if (legacyProviders[providerName]) {
    return {
      success: true,
      source: "legacy-registry",
      serviceName,
      providerName,
      config: legacyProviders[providerName]
    };
  }

  return {
    success: false,
    serviceName,
    providerName,
    error: "Provider not found in admin config or legacy registry"
  };
}

module.exports = {
  loadLegacyProviderRegistry,
  normalizeLegacyProviders,
  getAdminAwareProviderRegistry,
  getProviderExecutionOrder,
  getActiveProviderName,
  getProviderConfig
};
