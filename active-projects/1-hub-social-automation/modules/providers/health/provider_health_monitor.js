const {
  buildProviderUsageSummary
} = require("../analytics/provider_usage_summary");

const {
  getProviderQuotaStatus
} = require("../quota/provider_quota_tracker");

function classifyHealth(score) {
  if (score >= 80) return "healthy";
  if (score >= 50) return "warning";
  return "critical";
}

function calculateProviderHealth(providerId) {
  const usageSummary = buildProviderUsageSummary();

  const providerStats =
    usageSummary.byProvider?.[providerId] || null;

  const quota = getProviderQuotaStatus(providerId);

  const successRate = providerStats?.successRate || 0;

  let score = successRate;

  if (quota.success && quota.totalKeys > 0) {
    const usableRatio =
      quota.totalKeys === 0
        ? 0
        : (quota.usableKeys / quota.totalKeys) * 100;

    score = Number(
      ((successRate * 0.7) + (usableRatio * 0.3)).toFixed(2)
    );
  }

  return {
    providerId,
    score,
    status: classifyHealth(score),
    successRate,
    totalRequests: providerStats?.total || 0,
    totalFailures: providerStats?.failed || 0,
    usableKeys: quota.usableKeys || 0,
    totalKeys: quota.totalKeys || 0,
    checkedAt: new Date().toISOString()
  };
}

function calculateHealthForProviders(providerIds = []) {
  return providerIds.map(calculateProviderHealth);
}

module.exports = {
  classifyHealth,
  calculateProviderHealth,
  calculateHealthForProviders
};
