const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.resolve(
  process.cwd(),
  "modules/publishing/registry/publishing_providers.json"
);

function readRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function writeRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  return readRegistry();
}

function listPlatforms() {
  const registry = readRegistry();

  return Object.keys(registry).map((platform) => ({
    platform,
    active: registry[platform].active,
    fallbacks: registry[platform].fallbacks || [],
    providers: Object.values(registry[platform].providers || {})
  }));
}

function getPlatformConfig(platform) {
  const registry = readRegistry();
  return registry[platform] || null;
}

function setActivePublishingProvider(platform, providerId) {
  const registry = readRegistry();

  if (!registry[platform]) {
    throw new Error(`Unknown publishing platform: ${platform}`);
  }

  if (!registry[platform].providers?.[providerId]) {
    throw new Error(`Unknown provider ${providerId} for platform ${platform}`);
  }

  registry[platform].active = providerId;
  return writeRegistry(registry);
}

module.exports = {
  REGISTRY_PATH,
  readRegistry,
  writeRegistry,
  listPlatforms,
  getPlatformConfig,
  setActivePublishingProvider
};
