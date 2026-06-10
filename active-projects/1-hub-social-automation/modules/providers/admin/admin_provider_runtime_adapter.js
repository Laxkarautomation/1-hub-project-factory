const {
  getProviderExecutionOrder,
  getProviderConfig,
  getActiveProviderName,
  getAdminAwareProviderRegistry
} = require("./admin_aware_provider_registry");

function createProviderRuntime(serviceName) {
  const activeProvider = getActiveProviderName(serviceName);
  const executionOrder = getProviderExecutionOrder(serviceName);
  const registry = getAdminAwareProviderRegistry(serviceName);

  return {
    success: !!activeProvider,
    source: "admin-aware-provider-runtime",
    serviceName,
    activeProvider,
    executionOrder,
    registry,
    getProvider(providerName) {
      return getProviderConfig(serviceName, providerName);
    },
    getActiveProvider() {
      if (!activeProvider) {
        return {
          success: false,
          serviceName,
          error: "No active provider found"
        };
      }

      return getProviderConfig(serviceName, activeProvider);
    },
    getFallbackProviders() {
      return executionOrder.map((providerName) => {
        return getProviderConfig(serviceName, providerName);
      });
    }
  };
}

module.exports = {
  createProviderRuntime
};
