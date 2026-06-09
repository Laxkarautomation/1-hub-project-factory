const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("elevenlabs");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "elevenlabs",
      status: "provider_unavailable",
      error: "ElevenLabs API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  return {
    success: false,
    provider: "elevenlabs",
    status: "not_implemented",
    error: "ElevenLabs runtime connector ready but TTS API not integrated yet",
    payload
  };
}

module.exports = {
  name: "elevenlabs",
  run
};
