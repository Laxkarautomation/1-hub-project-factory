const registry = require("../registry/publishing_registry");

function setPublishingProviderRuntime(platform, providerId, settings = {}) {
  const data = registry.readRegistry();

  if (!data[platform]) {
    throw new Error(`Unknown publishing platform: ${platform}`);
  }

  if (!data[platform].providers?.[providerId]) {
    throw new Error(`Unknown publishing provider: ${providerId}`);
  }

  data[platform].providers[providerId] = {
    ...data[platform].providers[providerId],
    ...settings,
    updatedAt: new Date().toISOString()
  };

  registry.writeRegistry(data);

  return {
    success: true,
    platform,
    providerId,
    provider: data[platform].providers[providerId]
  };
}

function enableRealPublishing(platform, providerId) {
  return setPublishingProviderRuntime(platform, providerId, {
    enabled: true,
    realPublishing: true,
    safeMode: false
  });
}

function disableRealPublishing(platform, providerId) {
  return setPublishingProviderRuntime(platform, providerId, {
    realPublishing: false,
    safeMode: true
  });
}

function getPublishingProviderRuntimeDashboard() {
  return {
    success: true,
    platforms: registry.listPlatforms()
  };
}

module.exports = {
  setPublishingProviderRuntime,
  enableRealPublishing,
  disableRealPublishing,
  getPublishingProviderRuntimeDashboard
};
