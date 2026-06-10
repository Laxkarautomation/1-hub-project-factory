const { loadProviderConfig } = require("../runtime/provider_config_store");
const { loadProviderKeys } = require("../runtime/provider_key_store");
const { buildProviderUsageSummary } = require("../analytics/provider_usage_summary");
const { getAllProviderQuotaStatus } = require("../quota/provider_quota_tracker");
const { calculateHealthForProviders } = require("../health/provider_health_monitor");

function getUniqueProviderIds(config) {
  const providerIds = new Set();

  for (const provider of config.providers || []) {
    providerIds.add(provider.providerId);
  }

  return Array.from(providerIds);
}

function buildProviderDashboardData() {
  const config = loadProviderConfig();
  const keys = loadProviderKeys();

  const providerIds = getUniqueProviderIds(config);
  const usage = buildProviderUsageSummary();
  const quota = getAllProviderQuotaStatus(providerIds);
  const health = calculateHealthForProviders(providerIds);

  const quotaMap = Object.fromEntries(
    quota.map(item => [item.providerId, item])
  );

  const healthMap = Object.fromEntries(
    health.map(item => [item.providerId, item])
  );

  const providers = providerIds.map(providerId => {
    const configEntry = config.providers.find(item => item.providerId === providerId);
    const usageEntry = usage.byProvider[providerId] || null;
    const keyCount = keys.keys.filter(key => key.providerId === providerId).length;

    return {
      providerId,
      category: configEntry?.category || "unknown",
      mode: configEntry?.mode || "unknown",
      priority: configEntry?.priority || null,
      enabled: configEntry?.enabled !== false,
      keyCount,
      usage: usageEntry || {
        total: 0,
        success: 0,
        failed: 0,
        successRate: 0
      },
      quota: quotaMap[providerId] || null,
      health: healthMap[providerId] || null
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      providers: providers.length,
      keys: keys.keys.length,
      usageTotal: usage.totals.total,
      usageSuccess: usage.totals.success,
      usageFailed: usage.totals.failed
    },
    providers
  };
}

module.exports = {
  buildProviderDashboardData
};
