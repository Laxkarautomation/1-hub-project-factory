const DryRunPublishingAdapter = require("../adapters/dry_run_publishing_adapter");

function createPublishingAdapter(platformConfig = {}, providerId = null) {
  const activeProviderId = providerId || platformConfig.active;
  const providerConfig = platformConfig.providers?.[activeProviderId];

  if (!providerConfig) {
    throw new Error(`Publishing provider not found: ${activeProviderId}`);
  }

  return new DryRunPublishingAdapter({
    ...providerConfig,
    providerId: activeProviderId
  });
}

module.exports = {
  createPublishingAdapter
};
