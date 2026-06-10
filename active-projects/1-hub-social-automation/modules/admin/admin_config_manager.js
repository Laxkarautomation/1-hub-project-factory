const {
  loadAdminConfig,
  saveAdminConfig,
  resetAdminConfig,
  ADMIN_CONFIG_PATH
} = require("./config/admin_config_store");

const { validateAdminConfig } = require("./validators/admin_config_validator");

function getAdminConfig() {
  const config = loadAdminConfig();
  const validation = validateAdminConfig(config);

  return {
    success: validation.valid,
    path: ADMIN_CONFIG_PATH,
    config,
    validation
  };
}

function setRuntimeValue(key, value) {
  const config = loadAdminConfig();

  if (!config.runtime) config.runtime = {};

  let parsedValue = value;

  if (value === "true") parsedValue = true;
  else if (value === "false") parsedValue = false;
  else if (!Number.isNaN(Number(value)) && value !== "") parsedValue = Number(value);

  config.runtime[key] = parsedValue;

  saveAdminConfig(config);

  return getAdminConfig();
}

function setActiveProvider(serviceName, providerName) {
  const config = loadAdminConfig();

  if (!config.providers || !config.providers[serviceName]) {
    throw new Error(`Service not found: ${serviceName}`);
  }

  const service = config.providers[serviceName];

  if (!service.providers || !service.providers[providerName]) {
    throw new Error(`Provider '${providerName}' not found in service '${serviceName}'`);
  }

  service.active = providerName;

  if (!Array.isArray(service.fallbackOrder)) {
    service.fallbackOrder = [];
  }

  if (!service.fallbackOrder.includes(providerName)) {
    service.fallbackOrder.unshift(providerName);
  }

  saveAdminConfig(config);

  return getAdminConfig();
}

function addProvider(serviceName, providerName, providerConfig) {
  const config = loadAdminConfig();

  if (!config.providers) config.providers = {};

  if (!config.providers[serviceName]) {
    config.providers[serviceName] = {
      active: providerName,
      fallbackOrder: [providerName],
      providers: {}
    };
  }

  config.providers[serviceName].providers[providerName] = {
    enabled: providerConfig.enabled !== false,
    type: providerConfig.type || "free",
    apiKeyRef: providerConfig.apiKeyRef || null,
    model: providerConfig.model || null,
    endpoint: providerConfig.endpoint || null,
    dailyLimit: Number(providerConfig.dailyLimit || 999999)
  };

  if (!Array.isArray(config.providers[serviceName].fallbackOrder)) {
    config.providers[serviceName].fallbackOrder = [];
  }

  if (!config.providers[serviceName].fallbackOrder.includes(providerName)) {
    config.providers[serviceName].fallbackOrder.push(providerName);
  }

  if (!config.providers[serviceName].active) {
    config.providers[serviceName].active = providerName;
  }

  saveAdminConfig(config);

  return getAdminConfig();
}

function resetConfig() {
  resetAdminConfig();
  return getAdminConfig();
}

module.exports = {
  getAdminConfig,
  setRuntimeValue,
  setActiveProvider,
  addProvider,
  resetConfig
};
