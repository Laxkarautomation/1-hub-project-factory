const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("cloudflare_tts");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  const accountId =
    credentials.accountId ||
    credentials.cloudflareAccountId ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "cloudflare_tts",
      status: "provider_unavailable",
      error: "Cloudflare TTS API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  if (!accountId) {
    return {
      success: false,
      provider: "cloudflare_tts",
      status: "provider_unavailable",
      error: "Cloudflare account id is not configured"
    };
  }

  return {
    success: false,
    provider: "cloudflare_tts",
    status: "not_implemented",
    error: "Cloudflare TTS runtime connector ready but TTS API not integrated yet",
    payload
  };
}

module.exports = {
  name: "cloudflare_tts",
  run
};
