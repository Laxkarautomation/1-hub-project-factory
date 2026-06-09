const { getProvidersByCategory } = require("./provider_config_store");
const { selectActiveKey } = require("./active_key_selector");

function selectActiveProvider(category, options = {}) {
  if (!category) {
    return {
      success: false,
      status: "no_category",
      reason: "Provider category is required",
      category: null,
      provider: null,
      key: null
    };
  }

  const providerConfig = getProvidersByCategory(category, options.configPath);

  if (!providerConfig.success) {
    return {
      success: false,
      status: "provider_config_error",
      reason: providerConfig.error,
      category,
      provider: null,
      key: null
    };
  }

  if (!providerConfig.providers.length) {
    return {
      success: false,
      status: "no_enabled_provider",
      reason: "No enabled providers found for category",
      category,
      provider: null,
      key: null
    };
  }

  const providers = providerConfig.providers;

  for (const provider of providers) {
    const keySelection = selectActiveKey(provider.providerId, {
      keyStorePath: options.keyStorePath
    });

    if (keySelection.success) {
      return {
        success: true,
        status: "provider_selected",
        category,
        provider,
        key: keySelection.key
      };
    }
  }

  return {
    success: false,
    status: "no_provider_with_usable_key",
    reason: "Providers exist but none have usable keys",
    category,
    provider: providers[0] || null,
    key: null,
    attemptedProviders: providers.map(provider => provider.providerId)
  };
}

module.exports = {
  selectActiveProvider
};
