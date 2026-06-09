function createMissingKeyProvider(name) {
  return {
    name,
    run: async () => ({
      success: false,
      error: "Provider API key not configured yet"
    })
  };
}

function getAudioProviders(providerNames = []) {
  return providerNames.map(name => {
    if (name === "edge_tts") {
      return {
        name: "edge_tts",
        run: async payload => ({
          success: true,
          provider: "edge_tts",
          message: "Edge-TTS is existing local/free provider. Existing audio pipeline should handle actual generation.",
          payload
        })
      };
    }

    if (["cloudflare_tts", "openai_tts", "elevenlabs"].includes(name)) {
      return createMissingKeyProvider(name);
    }

    return {
      name,
      run: async () => ({
        success: false,
        error: `Unknown audio provider: ${name}`
      })
    };
  });
}

module.exports = { getAudioProviders };
