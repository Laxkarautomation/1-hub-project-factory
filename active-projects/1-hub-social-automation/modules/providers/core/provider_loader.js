const fs = require("fs");
const path = require("path");

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadProviderConfig() {
  const configPath = path.join(process.cwd(), "modules/providers/config/generation_providers.json");
  return readJson(configPath, {});
}

function loadProviderKeys() {
  const keysPath = path.join(process.cwd(), "modules/providers/storage/provider_keys.json");
  return readJson(keysPath, {});
}

function getProviderStack(type) {
  const config = loadProviderConfig();
  const section = config[type];

  if (!section) {
    throw new Error(`Provider type not configured: ${type}`);
  }

  return {
    active: section.active,
    fallbacks: section.fallbacks || [],
    keys: loadProviderKeys()
  };
}

module.exports = {
  loadProviderConfig,
  loadProviderKeys,
  getProviderStack
};
