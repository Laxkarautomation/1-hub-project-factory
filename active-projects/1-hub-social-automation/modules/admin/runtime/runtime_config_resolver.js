const fs = require("fs");
const path = require("path");
const { loadAdminConfig } = require("../config/admin_config_store");
const { validateAdminConfig } = require("../validators/admin_config_validator");

function readActiveChannel() {
  const activeChannelPath = path.join(
    process.cwd(),
    "modules",
    "channels",
    "storage",
    "active_channel.json"
  );

  try {
    if (!fs.existsSync(activeChannelPath)) return null;
    const data = JSON.parse(fs.readFileSync(activeChannelPath, "utf8"));
    return data.channelId || data.activeChannelId || null;
  } catch (error) {
    return null;
  }
}

function resolveSecret(apiKeyRef) {
  if (!apiKeyRef) return null;
  return process.env[apiKeyRef] || null;
}

function resolveProvider(serviceName, config) {
  const service = config.providers[serviceName];

  if (!service) {
    return {
      serviceName,
      found: false,
      active: null,
      fallbackOrder: [],
      provider: null
    };
  }

  const activeName = service.active;
  const activeProvider = service.providers[activeName] || null;

  return {
    serviceName,
    found: true,
    active: activeName,
    fallbackOrder: service.fallbackOrder || [],
    provider: activeProvider
      ? {
          ...activeProvider,
          apiKey: resolveSecret(activeProvider.apiKeyRef)
        }
      : null
  };
}

function resolveRuntimeConfig() {
  const config = loadAdminConfig();
  const validation = validateAdminConfig(config);
  const activeChannelId = readActiveChannel();

  const services = {};
  for (const serviceName of Object.keys(config.providers || {})) {
    services[serviceName] = resolveProvider(serviceName, config);
  }

  return {
    success: validation.valid,
    phase: "11-admin-config-control-layer",
    activeChannelId,
    environment: config.environment,
    system: config.system,
    runtime: config.runtime,
    services,
    validation
  };
}

module.exports = {
  resolveRuntimeConfig,
  resolveProvider,
  readActiveChannel
};
