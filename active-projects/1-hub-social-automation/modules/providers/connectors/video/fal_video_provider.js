const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("fal_video");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "fal_video",
      status: "provider_unavailable",
      error: "FAL Video API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  return {
    success: false,
    provider: "fal_video",
    status: "not_implemented",
    error: "FAL video runtime connector ready but video API not integrated yet",
    payload
  };
}

module.exports = {
  name: "fal_video",
  run
};
