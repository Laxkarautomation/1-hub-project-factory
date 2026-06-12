const registry = require("../registry/publishing_registry");

const {
  getSecretDashboard,
  getProviderSecrets,
  getMaskedProviderSecrets,
  saveProviderSecrets,
  deleteProviderSecrets
} = require("../secrets/publishing_secret_store");

const REQUIRED_KEYS = {
  youtube_api: ["clientId", "clientSecret", "refreshToken"],
  meta_graph_api: ["accessToken", "pageId"],
  linkedin_api: ["accessToken", "organizationId"],
  x_api: ["apiKey", "apiSecret", "accessToken", "accessTokenSecret"],
  telegram_bot_api: ["botToken", "chatId"],
  dry_run: []
};

function getProviderCredentialStatus(providerId) {
  const secrets = getProviderSecrets(providerId);
  const required = REQUIRED_KEYS[providerId] || [];
  const present = required.filter((key) => Boolean(secrets[key]));
  const missing = required.filter((key) => !secrets[key]);

  return {
    providerId,
    required,
    present,
    missing,
    ready: missing.length === 0,
    masked: getMaskedProviderSecrets(providerId),
    updatedAt: secrets.updatedAt || null
  };
}

function getPublishingCredentialsDashboard() {
  const platforms = registry.listPlatforms();

  const providerStatuses = [];

  platforms.forEach((platform) => {
    (platform.providers || []).forEach((provider) => {
      providerStatuses.push({
        platform: platform.platform,
        active: platform.active === provider.providerId,
        ...getProviderCredentialStatus(provider.providerId)
      });
    });
  });

  return {
    success: true,
    secrets: getSecretDashboard(),
    providerStatuses
  };
}

function savePublishingProviderSecrets(input = {}) {
  const providerId = input.providerId;

  if (!providerId) {
    throw new Error("providerId is required");
  }

  const secrets = input.secrets || {};

  saveProviderSecrets(providerId, secrets);

  return {
    success: true,
    status: getProviderCredentialStatus(providerId)
  };
}

function removePublishingProviderSecrets(providerId) {
  deleteProviderSecrets(providerId);

  return {
    success: true,
    providerId
  };
}

module.exports = {
  REQUIRED_KEYS,
  getProviderCredentialStatus,
  getPublishingCredentialsDashboard,
  savePublishingProviderSecrets,
  removePublishingProviderSecrets
};
