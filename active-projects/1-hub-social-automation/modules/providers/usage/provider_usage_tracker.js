const { appendUsageEntry } = require("./provider_usage_store");

function trackProviderUsage({
  provider,
  type,
  result,
  keyId = null,
  model = null,
  durationMs = null,
  metadata = {}
}) {
  return appendUsageEntry({
    provider,
    type,
    status: result?.status || "unknown",
    success: result?.success === true,
    keyId: keyId || result?.keyId || null,
    model: model || result?.model || null,
    durationMs,
    error: result?.error || null,
    metadata
  });
}

module.exports = {
  trackProviderUsage
};
