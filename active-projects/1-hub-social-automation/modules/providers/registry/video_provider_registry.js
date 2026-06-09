function createMissingKeyProvider(name) {
  return {
    name,
    run: async () => ({
      success: false,
      error: "Provider API key not configured yet"
    })
  };
}

function getVideoProviders(providerNames = []) {
  return providerNames.map(name => {
    if (name === "ffmpeg") {
      return {
        name: "ffmpeg",
        run: async payload => ({
          success: true,
          provider: "ffmpeg",
          message: "FFmpeg is existing local/free renderer. Existing video renderer should handle actual rendering.",
          payload
        })
      };
    }

    if (["remotion", "fal_video", "runway"].includes(name)) {
      return createMissingKeyProvider(name);
    }

    return {
      name,
      run: async () => ({
        success: false,
        error: `Unknown video provider: ${name}`
      })
    };
  });
}

module.exports = { getVideoProviders };
