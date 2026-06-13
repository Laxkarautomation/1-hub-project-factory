const { getProviderStack } = require("./provider_loader");
const { runFallbackStack } = require("./fallback_engine");

const { getScriptProviders } = require("../registry/script_provider_registry");
const { getImageProviders } = require("../registry/image_provider_registry");
const { getAudioProviders } = require("../registry/audio_provider_registry");
const { getVideoProviders } = require("../registry/video_provider_registry");

const registryMap = {
  script: getScriptProviders,
  image: getImageProviders,
  audio: getAudioProviders,
  video: getVideoProviders
};

function resolveProviderNames(type, overrideProviderNames = null) {
  const stack = getProviderStack(type);

  const providerNames =
    Array.isArray(overrideProviderNames) && overrideProviderNames.length > 0
      ? overrideProviderNames
      : [stack.active, ...(stack.fallbacks || [])];

  return [...new Set(providerNames.filter(Boolean))];
}

function resolveProviders(type, overrideProviderNames = null) {
  const stack = getProviderStack(type);
  const registryFactory = registryMap[type];

  if (!registryFactory) {
    throw new Error(`Provider registry not found for type: ${type}`);
  }

  const providerNames = resolveProviderNames(type, overrideProviderNames);

  return {
    type,
    providerNames,
    providers: registryFactory(providerNames, stack.keys || {}, stack.providerConfig || {})
  };
}

async function executeProvider(type, payload = {}, options = {}) {
  const { providerNames, providers } = resolveProviders(type, options.providers);

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      type,
      providerNames,
      payload
    };
  }

  return runFallbackStack({
    type,
    providers,
    payload
  });
}

module.exports = {
  resolveProviderNames,
  resolveProviders,
  executeProvider
};
