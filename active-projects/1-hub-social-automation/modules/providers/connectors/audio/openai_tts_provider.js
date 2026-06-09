const { selectActiveKey } = require("../../runtime/active_key_selector");

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("openai_tts");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "openai_tts",
      status: "provider_unavailable",
      error: "OpenAI TTS API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  return {
    success: false,
    provider: "openai_tts",
    status: "not_implemented",
    error: "OpenAI TTS runtime connector ready but TTS API not integrated yet",
    payload
  };
}

module.exports = {
  name: "openai_tts",
  run
};
