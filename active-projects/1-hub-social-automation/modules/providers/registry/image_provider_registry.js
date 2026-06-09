function createMissingKeyProvider(name) {
  return {
    name,
    run: async () => ({
      success: false,
      error: "Provider API key not configured yet"
    })
  };
}

function getImageProviders(providerNames = []) {
  return providerNames.map(name => {
    if (["cloudflare", "google", "fal"].includes(name)) {
      return createMissingKeyProvider(name);
    }

    if (name === "placeholder") {
      return {
        name: "placeholder",
        run: async payload => ({
          success: false,
          error: "Placeholder provider connected but no replacement image generated yet",
          payload
        })
      };
    }

    return {
      name,
      run: async () => ({
        success: false,
        error: `Unknown image provider: ${name}`
      })
    };
  });
}

module.exports = { getImageProviders };
