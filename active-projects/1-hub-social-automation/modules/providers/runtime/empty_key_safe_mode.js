const KEYLESS_PROVIDER_IDS = new Set([
  "template",
  "placeholder",
  "edge_tts",
  "ffmpeg"
]);

function isKeylessProvider(providerId) {
  return KEYLESS_PROVIDER_IDS.has(providerId);
}

function createKeylessProviderResult(providerId) {
  return {
    success: true,
    status: "key_not_required",
    providerId,
    keyId: null,
    label: "Key not required",
    key: {
      providerId,
      keyId: null,
      label: "Key not required",
      value: "",
      isActive: true,
      status: "keyless",
      usageCount: 0,
      dailyLimit: null,
      lastUsedAt: null,
      createdAt: null
    }
  };
}

function createProviderUnavailableResult(providerId, reason) {
  return {
    success: false,
    status: "provider_unavailable",
    providerId,
    reason: reason || "Provider unavailable because no usable key exists",
    key: null
  };
}

module.exports = {
  KEYLESS_PROVIDER_IDS,
  isKeylessProvider,
  createKeylessProviderResult,
  createProviderUnavailableResult
};
