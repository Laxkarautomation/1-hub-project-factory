const { loadProviderConfig } = require("../runtime/provider_config_store");
const { loadProviderKeys } = require("../runtime/provider_key_store");

function normalizePriority(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 100;
}

function getProviderNames(section = {}) {
  const providerMap = section.providers || {};

  const adminProviders = Object.values(providerMap)
    .filter((provider) => provider && provider.active !== false)
    .sort((a, b) => normalizePriority(a.priority) - normalizePriority(b.priority))
    .map((provider) => provider.providerName || provider.providerId || provider.name)
    .filter(Boolean);

  const legacyProviders = [section.active, ...(section.fallbacks || [])].filter(Boolean);

  return [...new Set([...adminProviders, ...legacyProviders])]
    .filter((name) => name !== "placeholder" && name !== "template");
}

function getProviderStack(type) {
  const config = loadProviderConfig();

  if (!config.success) {
    throw new Error("Provider config load failed: " + config.error);
  }

  const section = config.raw[type];

  if (!section) {
    throw new Error("Provider type not configured: " + type);
  }

  const keys = loadProviderKeys();
  const providerNames = getProviderNames(section);

  return {
    active: section.active,
    fallbacks: providerNames,
    keys: keys.raw || {},
    providerConfig: section.providers || {},
    runtimeConfig: config,
    runtimeKeys: keys
  };
}

module.exports = {
  loadProviderConfig,
  loadProviderKeys,
  getProviderStack
};
