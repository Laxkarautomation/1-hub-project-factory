const DryRunPublishingAdapter = require("../adapters/dry_run_publishing_adapter");
const YouTubePublishingAdapter = require("../adapters/platforms/youtube_publishing_adapter");
const InstagramPublishingAdapter = require("../adapters/platforms/instagram_publishing_adapter");
const FacebookPublishingAdapter = require("../adapters/platforms/facebook_publishing_adapter");
const LinkedInPublishingAdapter = require("../adapters/platforms/linkedin_publishing_adapter");
const XPublishingAdapter = require("../adapters/platforms/x_publishing_adapter");
const TelegramPublishingAdapter = require("../adapters/platforms/telegram_publishing_adapter");

const {
  getProviderCredentialStatus
} = require("./publishing_credentials_service");

const ADAPTERS = {
  youtube: YouTubePublishingAdapter,
  instagram: InstagramPublishingAdapter,
  facebook: FacebookPublishingAdapter,
  linkedin: LinkedInPublishingAdapter,
  x: XPublishingAdapter,
  telegram: TelegramPublishingAdapter
};

function resolveProvider(platformConfig = {}, requestedProviderId = null) {
  const providers = platformConfig.providers || {};
  const candidates = [
    requestedProviderId,
    platformConfig.active,
    ...(platformConfig.fallbacks || []),
    "dry_run"
  ].filter(Boolean);

  for (const providerId of candidates) {
    if (providerId === "dry_run") {
      return {
        providerId: "dry_run",
        providerConfig: {
          providerId: "dry_run",
          mode: "dry_run",
          enabled: true,
          requiresAuth: false
        }
      };
    }

    const providerConfig = providers[providerId];

    if (providerConfig) {
      return {
        providerId,
        providerConfig
      };
    }
  }

  return {
    providerId: "dry_run",
    providerConfig: {
      providerId: "dry_run",
      mode: "dry_run",
      enabled: true,
      requiresAuth: false
    }
  };
}

function createPublishingAdapter(platformConfig = {}, providerId = null) {
  const platform =
    platformConfig.platform ||
    Object.values(platformConfig.providers || {})[0]?.platform ||
    null;

  const resolved = resolveProvider(platformConfig, providerId);
  const AdapterClass = ADAPTERS[platform] || DryRunPublishingAdapter;

  return new AdapterClass({
    ...resolved.providerConfig,
    providerId: resolved.providerId,
    platform,
    dryRun: true
  });
}

function getAdapterHealth(platformConfig = {}) {
  const providers = platformConfig.providers || {};
  const providerList = Object.values(providers);

  return {
    success: true,
    platform: providerList[0]?.platform || null,
    active: platformConfig.active || null,
    fallbacks: platformConfig.fallbacks || [],
    providers: providerList.map((provider) => {
      const credentialStatus = getProviderCredentialStatus(provider.providerId);

      return {
        providerId: provider.providerId,
        platform: provider.platform,
        enabled: provider.enabled === true,
        mode: provider.mode || "api",
        requiresAuth: provider.requiresAuth === true,
        credentialsReady: credentialStatus.ready,
        missingCredentials: credentialStatus.missing,
        readyForRealPublishing:
          provider.enabled === true &&
          (
            provider.requiresAuth !== true ||
            credentialStatus.ready === true
          )
      };
    }),
    dryRunAvailable: true
  };
}

module.exports = {
  createPublishingAdapter,
  resolveProvider,
  getAdapterHealth
};
