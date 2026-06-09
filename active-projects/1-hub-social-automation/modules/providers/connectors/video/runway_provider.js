const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("runway");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "runway",
      status: "provider_unavailable",
      error: "Runway API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  return {
    success: false,
    provider: "runway",
    status: "not_implemented",
    error: "Runway runtime connector ready but video API not integrated yet",
    payload
  };
}

module.exports = {
  name: "runway",
  run
};
