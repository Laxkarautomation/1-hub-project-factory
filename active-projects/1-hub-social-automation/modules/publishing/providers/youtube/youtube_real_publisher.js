const {
  validateYouTubeCredentials,
  refreshYouTubeAccessToken,
  getYouTubeChannelStatus
} = require("./youtube_oauth_service");

const {
  uploadYouTubeVideo
} = require("./youtube_upload_service");

function getYouTubeOAuthStatus(providerId = "youtube_api") {
  const status =
    validateYouTubeCredentials(providerId);

  return {
    success: true,
    providerId,
    ready: status.ready,
    missing: status.missing,
    authMode: "oauth_refresh_token"
  };
}

async function publishYouTube(job, config = {}) {
  const providerId =
    config.providerId || "youtube_api";

  const safeMode =
    config.safeMode !== false;

  const status =
    getYouTubeOAuthStatus(providerId);

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

  return uploadYouTubeVideo(
    job,
    {
      providerId,
      safeMode
    }
  );
}

module.exports = {
  getYouTubeOAuthStatus,
  refreshYouTubeAccessToken,
  getYouTubeChannelStatus,
  publishYouTube
};
