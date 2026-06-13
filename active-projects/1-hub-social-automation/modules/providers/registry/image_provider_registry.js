const cloudflare = require("../connectors/image/cloudflare_provider");
const google = require("../connectors/image/google_provider");
const fal = require("../connectors/image/fal_provider");

const connectorMap = {
  cloudflare,
  google,
  fal
};

function firstActiveKey(providerKeys = []) {
  if (!Array.isArray(providerKeys)) return {};
  return providerKeys.find((key) => key && key.isActive === true && key.status === "active") || providerKeys[0] || {};
}

function getImageProviders(providerNames = [], keys = {}, providerConfig = {}) {
  return providerNames
    .filter((name) => name && name !== "placeholder")
    .map((name) => {
      const provider = connectorMap[name];

      if (!provider) {
        return {
          name,
          run: async () => ({
            success: false,
            provider: name,
            status: "provider_unavailable",
            error: "Image connector not found for provider: " + name
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

module.exports = { getImageProviders };
