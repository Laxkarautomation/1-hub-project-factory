const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("google");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "google",
      status: "provider_unavailable",
      error: "Google image API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  return {
    success: false,
    provider: "google",
    status: "not_implemented",
    error: "Google image runtime connector ready but image generation API not integrated yet",
    payload
  };
}

module.exports = {
  name: "google",
  run
};
