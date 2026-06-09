const falVideo = require("../connectors/video/fal_video_provider");
const runway = require("../connectors/video/runway_provider");
const remotion = require("../connectors/video/remotion_provider");

function getVideoProviders(providerNames = [], keys = {}) {
  const map = {
    fal_video: falVideo,
    runway,
    remotion,
    ffmpeg: {
      name: "ffmpeg",
      run: async payload => ({
        success: true,
        provider: "ffmpeg",
        message: "FFmpeg is existing local/free renderer. Existing video renderer should handle actual rendering.",
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
          error: `Unknown video provider: ${name}`
        })
      };
    }

    return {
      name: provider.name,
      run: payload => provider.run(payload, keys[name] || {})
    };
  });
}

module.exports = { getVideoProviders };
