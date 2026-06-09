const fs = require("fs");
const path = require("path");

const DEFAULT_KEY_STORE_PATH = path.join(
  process.cwd(),
  "modules/providers/storage/provider_keys.json"
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

function normalizeKeyRecord(providerId, key, index) {
  return {
    providerId,
    keyId: key.keyId || key.id || `${providerId}_key_${index + 1}`,
    label: key.label || `${providerId} key ${index + 1}`,
    value: key.value || key.apiKey || "",
    isActive: key.isActive === true,
    status: key.status || "inactive",
    usageCount: Number.isFinite(key.usageCount) ? key.usageCount : 0,
    dailyLimit: Number.isFinite(key.dailyLimit) ? key.dailyLimit : null,
    lastUsedAt: key.lastUsedAt || null,
    createdAt: key.createdAt || null,
    raw: key
  };
}

function normalizeKeyStore(rawStore) {
  const records = [];

  for (const [providerId, keys] of Object.entries(rawStore || {})) {
    const providerKeys = Array.isArray(keys) ? keys : [];

    providerKeys.forEach((key, index) => {
      records.push(normalizeKeyRecord(providerId, key, index));
    });
  }

  return records;
}

function loadProviderKeys(keyStorePath = DEFAULT_KEY_STORE_PATH) {
  const rawStore = readJson(keyStorePath, {});

  if (rawStore.error) {
    return {
      success: false,
      error: rawStore.message,
      keys: [],
      keyStorePath
    };
  }

  return {
    success: true,
    keys: normalizeKeyStore(rawStore),
    raw: rawStore,
    keyStorePath
  };
}

function getKeysForProvider(providerId, keyStorePath = DEFAULT_KEY_STORE_PATH) {
  const store = loadProviderKeys(keyStorePath);

  return {
    ...store,
    keys: store.keys.filter(key => key.providerId === providerId)
  };
}

function getUsableKeysForProvider(providerId, keyStorePath = DEFAULT_KEY_STORE_PATH) {
  const store = getKeysForProvider(providerId, keyStorePath);

  return {
    ...store,
    keys: store.keys.filter(key => {
      const hasValue = typeof key.value === "string" && key.value.trim().length > 0;
      const underLimit = key.dailyLimit === null || key.usageCount < key.dailyLimit;

      return key.isActive === true &&
        key.status === "active" &&
        hasValue &&
        underLimit;
    })
  };
}

module.exports = {
  DEFAULT_KEY_STORE_PATH,
  loadProviderKeys,
  getKeysForProvider,
  getUsableKeysForProvider
};
