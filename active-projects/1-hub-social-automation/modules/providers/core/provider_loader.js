const {
  loadProviderConfig
} = require("../runtime/provider_config_store");

const {
  loadProviderKeys
} = require("../runtime/provider_key_store");

function getProviderStack(type) {
  const config = loadProviderConfig();

  if (!config.success) {
    throw new Error(`Provider config load failed: ${config.error}`);
  }

  const section = config.raw[type];

  if (!section) {
    throw new Error(`Provider type not configured: ${type}`);
  }

  const keys = loadProviderKeys();

  return {
    active: section.active,
    fallbacks: section.fallbacks || [],
    keys: keys.raw || {},
    runtimeConfig: config,
    runtimeKeys: keys
  };
}

module.exports = {
  loadProviderConfig,
  loadProviderKeys,
  getProviderStack
};
