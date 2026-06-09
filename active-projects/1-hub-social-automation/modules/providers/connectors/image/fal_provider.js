const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("fal");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "fal",
      status: "provider_unavailable",
      error: "Fal API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  return {
    success: false,
    provider: "fal",
    status: "not_implemented",
    error: "Fal image runtime connector ready but image generation API not integrated yet",
    payload
  };
}

module.exports = {
  name: "fal",
  run
};
