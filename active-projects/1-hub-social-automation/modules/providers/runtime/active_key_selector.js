const {
  getKeysForProvider,
  getUsableKeysForProvider
} = require("./provider_key_store");

const {
  isKeylessProvider,
  createKeylessProviderResult
} = require("./empty_key_safe_mode");

function selectActiveKey(providerId, options = {}) {
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
    return {
      success: false,
      status: "key_store_error",
      reason: usableStore.error,
      providerId,
      key: null
    };
  }

  if (usableStore.keys.length > 0) {
    const selectedKey = usableStore.keys[0];

    return {
      success: true,
      status: "active_key_selected",
      providerId,
      keyId: selectedKey.keyId,
      label: selectedKey.label,
      key: selectedKey
    };
  }

  const allKeysStore = getKeysForProvider(providerId, options.keyStorePath);

  return {
    success: false,
    status: "no_usable_key",
    reason: allKeysStore.keys.length
      ? "Provider has keys but none are active/usable"
      : "Provider has no keys configured",
    providerId,
    key: null,
    totalKeys: allKeysStore.keys.length
  };
}

module.exports = {
  selectActiveKey
};
