const fs = require("fs");
const path = require("path");
const { readUsageLog } = require("../usage/provider_usage_store");

const DEFAULT_USAGE_SUMMARY_PATH = path.join(
  process.cwd(),
  "modules/providers/output/provider_usage_summary.json"
);

function createEmptyProviderStats(provider) {
  return {
    provider,
    total: 0,
    success: 0,
    failed: 0,
    successRate: 0,
    failuresByStatus: {},
    models: {},
    totalDurationMs: 0,
    averageDurationMs: 0,
    lastUsedAt: null
  };
}

function summarizeUsage(entries = []) {
  const byProvider = {};
  const byType = {};
  const totals = {
    total: entries.length,
    success: 0,
    failed: 0,
    successRate: 0
  };

  for (const entry of entries) {
    const provider = entry.provider || "unknown";
    const type = entry.type || "unknown";

    if (!byProvider[provider]) {
      byProvider[provider] = createEmptyProviderStats(provider);
    }

    if (!byType[type]) {
      byType[type] = {
        type,
        total: 0,
        success: 0,
        failed: 0,
        successRate: 0
      };
    }

    const providerStats = byProvider[provider];
    const typeStats = byType[type];

    providerStats.total += 1;
    typeStats.total += 1;

    if (entry.success === true) {
      totals.success += 1;
      providerStats.success += 1;
      typeStats.success += 1;
    } else {
      totals.failed += 1;
      providerStats.failed += 1;
      typeStats.failed += 1;

      const status = entry.status || "unknown";
      providerStats.failuresByStatus[status] =
        (providerStats.failuresByStatus[status] || 0) + 1;
    }

    if (entry.model) {
      providerStats.models[entry.model] =
        (providerStats.models[entry.model] || 0) + 1;
    }

    if (Number.isFinite(entry.durationMs)) {
      providerStats.totalDurationMs += entry.durationMs;
    }

    providerStats.lastUsedAt = entry.createdAt || providerStats.lastUsedAt;
  }

  for (const stats of Object.values(byProvider)) {
    stats.successRate = stats.total
      ? Number(((stats.success / stats.total) * 100).toFixed(2))
      : 0;

    stats.averageDurationMs = stats.total
      ? Number((stats.totalDurationMs / stats.total).toFixed(2))
      : 0;
  }

  for (const stats of Object.values(byType)) {
    stats.successRate = stats.total
      ? Number(((stats.success / stats.total) * 100).toFixed(2))
      : 0;
  }

  totals.successRate = totals.total
    ? Number(((totals.success / totals.total) * 100).toFixed(2))
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals,
    byProvider,
    byType
  };
}

function buildProviderUsageSummary(options = {}) {
  const entries = readUsageLog(options.usageLogPath);
  return summarizeUsage(entries);
}

function saveProviderUsageSummary(summary, outputPath = DEFAULT_USAGE_SUMMARY_PATH) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  return outputPath;
}

module.exports = {
  DEFAULT_USAGE_SUMMARY_PATH,
  summarizeUsage,
  buildProviderUsageSummary,
  saveProviderUsageSummary
};
