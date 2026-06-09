const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_PATH = path.join(
  process.cwd(),
  "modules/providers/config/generation_providers.json"
);

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    return {
      error: true,
      message: error.message,
      data: fallback
    };
  }
}

function normalizeProviderConfig(rawConfig) {
  const providers = [];

  for (const [category, config] of Object.entries(rawConfig || {})) {
    const activeProvider = config.active || null;
    const fallbacks = Array.isArray(config.fallbacks) ? config.fallbacks : [];

    fallbacks.forEach((providerId, index) => {
      providers.push({
        providerId,
        category,
        enabled: true,
        priority: index + 1,
        mode: providerId === activeProvider ? "active" : "fallback",
        isActiveProvider: providerId === activeProvider,
        metadata: {},
        raw: {
          category,
          active: activeProvider,
          fallbacks
        }
      });
    });
  }

  return providers;
}

function loadProviderConfig(configPath = DEFAULT_CONFIG_PATH) {
  const rawConfig = readJson(configPath, {});

  if (rawConfig.error) {
    return {
      success: false,
      error: rawConfig.message,
      providers: [],
      configPath
    };
  }

  return {
    success: true,
    providers: normalizeProviderConfig(rawConfig),
    raw: rawConfig,
    configPath
  };
}

function getEnabledProviders(configPath = DEFAULT_CONFIG_PATH) {
  const config = loadProviderConfig(configPath);

  return {
    ...config,
    providers: config.providers.filter(provider => provider.enabled)
  };
}

function getProvidersByCategory(category, configPath = DEFAULT_CONFIG_PATH) {
  const config = getEnabledProviders(configPath);

  return {
    ...config,
    providers: config.providers
      .filter(provider => provider.category === category)
      .sort((a, b) => a.priority - b.priority)
  };
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  loadProviderConfig,
  getEnabledProviders,
  getProvidersByCategory
};
