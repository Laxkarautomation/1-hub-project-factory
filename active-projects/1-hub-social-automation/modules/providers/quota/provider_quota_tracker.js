const { readUsageLog } = require("../usage/provider_usage_store");
const { getKeysForProvider } = require("../runtime/provider_key_store");

function getTodayPrefix(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function filterEntriesForToday(entries = [], date = new Date()) {
  const today = getTodayPrefix(date);
  return entries.filter(entry =>
    typeof entry.createdAt === "string" &&
    entry.createdAt.startsWith(today)
  );
}

function countDailyUsage({ providerId, keyId = null, date = new Date(), usageLogPath } = {}) {
  const entries = filterEntriesForToday(readUsageLog(usageLogPath), date);

  return entries.filter(entry => {
    if (providerId && entry.provider !== providerId) return false;
    if (keyId && entry.keyId !== keyId) return false;
    return true;
  }).length;
}

function getProviderQuotaStatus(providerId, options = {}) {
  const keyStore = getKeysForProvider(providerId, options.keyStorePath);

  if (!keyStore.success) {
    return {
      success: false,
      providerId,
      status: "key_store_error",
      error: keyStore.error,
      keys: []
    };
  }

  const keys = keyStore.keys.map(key => {
    const usedToday = countDailyUsage({
      providerId,
      keyId: key.keyId,
      date: options.date || new Date(),
      usageLogPath: options.usageLogPath
    });

    const dailyLimit = Number.isFinite(key.dailyLimit) ? key.dailyLimit : null;
    const remainingToday = dailyLimit === null ? null : Math.max(dailyLimit - usedToday, 0);
    const limitReached = dailyLimit !== null && usedToday >= dailyLimit;

    return {
      providerId,
      keyId: key.keyId,
      label: key.label,
      status: key.status,
      isActive: key.isActive,
      dailyLimit,
      usedToday,
      remainingToday,
      limitReached
    };
  });

  return {
    success: true,
    providerId,
    status: "quota_checked",
    totalKeys: keys.length,
    usableKeys: keys.filter(key =>
      key.isActive === true &&
      key.status === "active" &&
      key.limitReached === false
    ).length,
    keys
  };
}

function getAllProviderQuotaStatus(providerIds = [], options = {}) {
  return providerIds.map(providerId => getProviderQuotaStatus(providerId, options));
}

module.exports = {
  getTodayPrefix,
  filterEntriesForToday,
  countDailyUsage,
  getProviderQuotaStatus,
  getAllProviderQuotaStatus
};
