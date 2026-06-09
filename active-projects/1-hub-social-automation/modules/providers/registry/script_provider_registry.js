function createMissingKeyProvider(name) {
  return {
    name,
    run: async () => ({
      success: false,
      error: "Provider API key not configured yet"
    })
  };
}

function getScriptProviders(providerNames = []) {
  return providerNames.map(name => {
    if (name === "template") {
      return {
        name: "template",
        run: async payload => ({
          success: true,
          provider: "template",
          message: "Template script engine is local/free fallback. Existing script pipeline should handle actual generation.",
          payload
        })
      };
    }

    if (["gemini", "openai", "claude"].includes(name)) {
      return createMissingKeyProvider(name);
    }

    return {
      name,
      run: async () => ({
        success: false,
        error: `Unknown script provider: ${name}`
      })
    };
  });
}

module.exports = { getScriptProviders };
