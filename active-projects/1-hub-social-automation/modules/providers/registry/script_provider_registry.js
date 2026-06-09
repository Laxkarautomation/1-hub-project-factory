const gemini = require("../connectors/script/gemini_provider");
const openai = require("../connectors/script/openai_provider");
const claude = require("../connectors/script/claude_provider");

function getScriptProviders(providerNames = [], keys = {}) {
  const map = {
    gemini,
    openai,
    claude,
    template: {
      name: "template",
      run: async payload => ({
        success: true,
        provider: "template",
        message: "Template script engine is local/free fallback. Existing script pipeline should handle actual generation.",
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
          error: `Unknown script provider: ${name}`
        })
      };
    }

    return {
      name: provider.name,
      run: payload => provider.run(payload, keys[name] || {})
    };
  });
}

module.exports = { getScriptProviders };
