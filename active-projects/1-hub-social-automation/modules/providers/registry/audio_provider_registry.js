const cloudflareTts = require("../connectors/audio/cloudflare_tts_provider");
const openaiTts = require("../connectors/audio/openai_tts_provider");
const elevenlabs = require("../connectors/audio/elevenlabs_provider");

function getAudioProviders(providerNames = [], keys = {}) {
  const map = {
    cloudflare_tts: cloudflareTts,
    openai_tts: openaiTts,
    elevenlabs,
    edge_tts: {
      name: "edge_tts",
      run: async payload => ({
        success: true,
        provider: "edge_tts",
        message: "Edge-TTS is existing local/free provider. Existing audio pipeline should handle actual generation.",
        payload
      })
    }
  };

  return providerNames.map(name => {
    const provider = map[name];

    if (!provider) {
      return {
        name,
        run: async () => ({
          success: false,
          provider: name,
          error: `Unknown audio provider: ${name}`
        })
      };
    }

    return {
      name: provider.name,
      run: payload => provider.run(payload, keys[name] || {})
    };
  });
}

module.exports = { getAudioProviders };
