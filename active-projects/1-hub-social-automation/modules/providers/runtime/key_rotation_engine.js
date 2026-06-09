const {
  getKeysForProvider,
  getUsableKeysForProvider
} = require("./provider_key_store");

const {
  isKeylessProvider,
  createKeylessProviderResult,
  createProviderUnavailableResult
} = require("./empty_key_safe_mode");

function rotateProviderKey(providerId, currentKeyId = null, options = {}) {
  if (!providerId) {
    return {
      success: false,
      status: "no_provider_id",
      reason: "Provider id is required",
      providerId: null,
      key: null
    };
  }

  if (isKeylessProvider(providerId)) {
    return createKeylessProviderResult(providerId);
  }

  const usableStore = getUsableKeysForProvider(providerId, options.keyStorePath);

  if (!usableStore.success) {
    return createProviderUnavailableResult(providerId, usableStore.error);
  }

  if (!usableStore.keys.length) {
    const allKeys = getKeysForProvider(providerId, options.keyStorePath);

    return {
      ...createProviderUnavailableResult(
        providerId,
        allKeys.keys.length
          ? "No next usable key found for provider"
          : "No keys configured for provider"
      ),
      totalKeys: allKeys.keys.length
    };
  }

  const nextKey =
    usableStore.keys.find(key => key.keyId !== currentKeyId) ||
    usableStore.keys[0];

  return {
    success: true,
    status: "key_rotated",
    providerId,
    previousKeyId: currentKeyId,
    keyId: nextKey.keyId,
    label: nextKey.label,
    key: nextKey
  };
}

function shouldRotateKey(key, failure = null) {
  if (!key) {
    return {
      rotate: true,
      reason: "missing_key"
    };
  }

  if (key.status !== "active" && key.status !== "keyless") {
    return {
      rotate: true,
      reason: "key_not_active"
    };
  }

  if (
    Number.isFinite(key.dailyLimit) &&
    Number.isFinite(key.usageCount) &&
    key.usageCount >= key.dailyLimit
  ) {
    return {
      rotate: true,
      reason: "daily_limit_reached"
    };
  }

  if (failure) {
    return {
      rotate: true,
      reason: "provider_failure"
    };
  }

  return {
    rotate: false,
    reason: "key_usable"
  };
}

module.exports = {
  rotateProviderKey,
  shouldRotateKey
};
