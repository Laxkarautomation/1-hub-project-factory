const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");

const PROVIDER_CONFIG = path.join(ROOT, "modules/providers/config/generation_providers.json");
const PROVIDER_KEYS = path.join(ROOT, "modules/providers/storage/provider_keys.json");
const PROVIDER_HEALTH = path.join(ROOT, "modules/providers/output/provider_health_status.json");
const PROVIDER_SUMMARY = path.join(ROOT, "modules/providers/output/provider_summary.json");
const PROVIDER_DASHBOARD = path.join(ROOT, "modules/providers/output/provider_dashboard_data.json");

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

function normalizePriority(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 100;
}

function saveGenerationProvider(input = {}) {
  const type = String(input.providerType || input.type || "").trim();
  const providerName = String(input.providerName || input.providerId || input.name || "").trim();

  if (!type || !providerName) {
    return {
      success: false,
      error: "providerType and providerName are required"
    };
  }

  const config = readJson(PROVIDER_CONFIG, {});
  config[type] = config[type] || { active: "", fallbacks: [], providers: {} };
  config[type].providers = config[type].providers || {};

  const providerRecord = {
    providerType: type,
    providerName,
    modelName: String(input.modelName || "").trim(),
    endpoint: String(input.endpoint || "").trim(),
    accountId: String(input.accountId || input.cloudflareAccountId || "").trim(),
    cloudflareAccountId: String(input.accountId || input.cloudflareAccountId || "").trim(),
    priority: normalizePriority(input.priority),
    active: input.active !== false,
    updatedAt: new Date().toISOString()
  };

  config[type].providers[providerName] = {
    ...(config[type].providers[providerName] || {}),
    ...providerRecord
  };

  const activeProviders = Object.values(config[type].providers)
    .filter((item) => item.active !== false)
    .sort((a, b) => normalizePriority(a.priority) - normalizePriority(b.priority))
    .map((item) => item.providerName);

  config[type].fallbacks = activeProviders;

  if (input.active === true || !config[type].active) {
    config[type].active = providerName;
  }

  if (!activeProviders.includes(config[type].active)) {
    config[type].active = activeProviders[0] || "";
  }

  writeJson(PROVIDER_CONFIG, config);

  if (input.apiKey || input.keyValue) {
    saveProviderKeys(providerName, [{
      keyId: input.keyId || providerName + "_admin_key_1",
      label: input.keyLabel || providerName + " admin key",
      value: input.apiKey || input.keyValue,
      apiKey: input.apiKey || input.keyValue,
      endpoint: providerRecord.endpoint,
      modelName: providerRecord.modelName,
      isActive: true,
      status: "active",
      createdAt: new Date().toISOString()
    }]);
  }

  return {
    success: true,
    type,
    providerName,
    config: config[type]
  };
}

function setActiveProvider(type, providerId) {
  const config = readJson(PROVIDER_CONFIG, {});

  if (!config[type]) {
    return { success: false, error: "Unknown provider type", type };
  }

  config[type].active = providerId;
  config[type].fallbacks = [
    providerId,
    ...(config[type].fallbacks || []).filter((item) => item !== providerId)
  ].filter(Boolean);

  if (config[type].providers?.[providerId]) {
    config[type].providers[providerId].active = true;
  }

  writeJson(PROVIDER_CONFIG, config);

  return { success: true, type, active: providerId };
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
  saveGenerationProvider,
  setActiveProvider,
  saveProviderKeys
};
