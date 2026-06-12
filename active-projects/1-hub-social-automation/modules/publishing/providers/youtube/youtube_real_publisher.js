const { getProviderSecrets } = require("../../secrets/publishing_secret_store");

function getYouTubeOAuthStatus(providerId = "youtube_api") {
  const secrets = getProviderSecrets(providerId);

  const required = ["clientId", "clientSecret", "refreshToken"];
  const missing = required.filter((key) => !secrets[key]);

  return {
    success: true,
    providerId,
    ready: missing.length === 0,
    missing,
    authMode: "oauth_refresh_token"
  };
}

async function publishYouTube(job, config = {}) {
  const providerId = config.providerId || "youtube_api";
  const status = getYouTubeOAuthStatus(providerId);

  if (!status.ready) {
    return {
      success: false,
      realPublish: true,
      providerId,
      platform: "youtube",
      jobId: job.jobId,
      error: "YouTube OAuth credentials missing",
      missing: status.missing
    };
  }

  return {
    success: true,
    realPublish: false,
    dryRun: true,
    providerId,
    platform: "youtube",
    jobId: job.jobId,
    message: "YouTube upload publisher configured but upload is disabled in safe mode",
    title: job.payload?.title || null,
    filePath: job.payload?.filePath || null,
    publishedAt: new Date().toISOString()
  };
}

module.exports = {
  getYouTubeOAuthStatus,
  publishYouTube
};
