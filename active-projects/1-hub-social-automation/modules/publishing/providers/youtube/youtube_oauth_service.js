const { getProviderSecrets } = require("../../secrets/publishing_secret_store");
const { requestJson } = require("../../utils/http_client");

function getYouTubeCredentials(providerId = "youtube_api") {
  return getProviderSecrets(providerId);
}

function validateYouTubeCredentials(providerId = "youtube_api") {
  const secrets = getYouTubeCredentials(providerId);

  const required = [
    "clientId",
    "clientSecret",
    "refreshToken"
  ];

  const missing = required.filter(
    (key) => !secrets[key]
  );

  return {
    success: missing.length === 0,
    providerId,
    missing,
    ready: missing.length === 0
  };
}

async function refreshYouTubeAccessToken(
  providerId = "youtube_api",
  options = {}
) {
  const validation =
    validateYouTubeCredentials(providerId);

  if (!validation.success) {
    return {
      success: false,
      providerId,
      error: "OAuth credentials missing",
      missing: validation.missing
    };
  }

  const secrets =
    getYouTubeCredentials(providerId);

  if (options.safeMode !== false) {
    return {
      success: true,
      safeMode: true,
      providerId,
      accessToken:
        "SAFE_MODE_ACCESS_TOKEN",
      expiresIn: 3600
    };
  }

  const body =
    new URLSearchParams({
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      refresh_token: secrets.refreshToken,
      grant_type: "refresh_token"
    }).toString();

  const response = await requestJson(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (
    !response.success ||
    !response.body?.access_token
  ) {
    return {
      success: false,
      providerId,
      error:
        response.body?.error_description ||
        response.error ||
        "Token refresh failed",
      response: response.body
    };
  }

  return {
    success: true,
    safeMode: false,
    providerId,
    accessToken:
      response.body.access_token,
    expiresIn:
      response.body.expires_in || 3600,
    scope: response.body.scope || null
  };
}

async function getYouTubeChannelStatus(
  providerId = "youtube_api",
  options = {}
) {
  const tokenResult =
    await refreshYouTubeAccessToken(
      providerId,
      options
    );

  if (!tokenResult.success) {
    return tokenResult;
  }

  if (options.safeMode !== false) {
    return {
      success: true,
      safeMode: true,
      providerId,
      connected: true,
      channelTitle:
        "SAFE_MODE_CHANNEL"
    };
  }

  const response = await requestJson(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    {
      method: "GET",
      headers: {
        Authorization:
          `Bearer ${tokenResult.accessToken}`
      }
    }
  );

  const item =
    response.body?.items?.[0];

  return {
    success:
      response.success &&
      Boolean(item),
    providerId,
    connected:
      response.success &&
      Boolean(item),
    channelTitle:
      item?.snippet?.title || null,
    response: response.body
  };
}

module.exports = {
  getYouTubeCredentials,
  validateYouTubeCredentials,
  refreshYouTubeAccessToken,
  getYouTubeChannelStatus
};
