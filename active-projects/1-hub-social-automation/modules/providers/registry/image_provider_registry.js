const cloudflare = require("../connectors/image/cloudflare_provider");
const google = require("../connectors/image/google_provider");
const fal = require("../connectors/image/fal_provider");

function getImageProviders(providerNames = [], keys = {}) {
  const map = {
    cloudflare,
    google,
    fal,
    placeholder: {
      name: "placeholder",
      run: async () => ({
        success: false,
        provider: "placeholder",
        error: "Placeholder provider connected but no replacement image generated yet"
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
          error: `Unknown image provider: ${name}`
        })
      };
    }

    return {
      name: provider.name,
      run: payload => provider.run(payload, keys[name] || {})
    };
  });
}

module.exports = { getImageProviders };
