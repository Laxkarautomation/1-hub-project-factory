const edgeTts = require("../connectors/audio/edge_tts_provider");
const cloudflareTts = require("../connectors/audio/cloudflare_tts_provider");
const openaiTts = require("../connectors/audio/openai_tts_provider");
const elevenlabs = require("../connectors/audio/elevenlabs_provider");

const connectorMap = {
  edge_tts: edgeTts,
  cloudflare_tts: cloudflareTts,
  openai_tts: openaiTts,
  elevenlabs
};

function firstActiveKey(providerKeys = []) {
  if (!Array.isArray(providerKeys)) return {};
  return providerKeys.find((key) => key && key.isActive === true && key.status === "active") || providerKeys[0] || {};
}

function getAudioProviders(providerNames = [], keys = {}, providerConfig = {}) {
  return providerNames
    .filter(Boolean)
    .map((name) => {
      const provider = connectorMap[name];

      if (!provider) {
        return {
          name,
          run: async () => ({
            success: false,
            provider: name,
            status: "provider_unavailable",
            error: "Audio connector not found for provider: " + name
          })
        };
      }

      return {
        name: provider.name || name,
        run: (payload) => provider.run(payload, {
          ...firstActiveKey(keys[name]),
          ...(providerConfig[name] || {})
        })
      };
    });
}

module.exports = { getAudioProviders };
