const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");

const PROVIDER_CONFIG =
  path.join(ROOT, "modules/providers/config/generation_providers.json");

const PROVIDER_KEYS =
  path.join(ROOT, "modules/providers/storage/provider_keys.json");

const PROVIDER_HEALTH =
  path.join(ROOT, "modules/providers/output/provider_health_status.json");

const PROVIDER_SUMMARY =
  path.join(ROOT, "modules/providers/output/provider_summary.json");

const PROVIDER_DASHBOARD =
  path.join(ROOT, "modules/providers/output/provider_dashboard_data.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getProviderDashboard() {
  return {
    success: true,
    config: readJson(PROVIDER_CONFIG, {}),
    keys: readJson(PROVIDER_KEYS, {}),
    health: readJson(PROVIDER_HEALTH, {}),
    summary: readJson(PROVIDER_SUMMARY, {}),
    dashboard: readJson(PROVIDER_DASHBOARD, {})
  };
}

function setActiveProvider(type, providerId) {
  const config = readJson(PROVIDER_CONFIG, {});

  if (!config[type]) {
    return {
      success: false,
      error: "Unknown provider type",
      type
    };
  }

  config[type].active = providerId;

  const fallbacks = config[type].fallbacks || [];

  if (!fallbacks.includes(providerId)) {
    fallbacks.unshift(providerId);
    config[type].fallbacks = [...new Set(fallbacks)];
  }

  writeJson(PROVIDER_CONFIG, config);

  return {
    success: true,
    type,
    active: providerId
  };
}

function saveProviderKeys(providerId, keys) {
  const db = readJson(PROVIDER_KEYS, {});

  db[providerId] = Array.isArray(keys) ? keys : [];

  writeJson(PROVIDER_KEYS, db);

  return {
    success: true,
    providerId,
    keyCount: db[providerId].length
  };
}

module.exports = {
  getProviderDashboard,
  setActiveProvider,
  saveProviderKeys
};
