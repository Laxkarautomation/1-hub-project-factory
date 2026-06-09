const {
  rotateProviderKey,
  shouldRotateKey
} = require("../runtime/key_rotation_engine");

function buildAttempt(provider, result, extra = {}) {
  return {
    provider: provider?.name || "unknown",
    success: !!result?.success,
    status: result?.status || null,
    error: result?.error || null,
    keyStatus: result?.keyStatus || null,
    rotation: extra.rotation || null
  };
}

async function runFallbackStack({ type, providers, payload }) {
  const attempts = [];

  for (const provider of providers) {
    if (!provider || typeof provider.run !== "function") {
      attempts.push({
        provider: provider?.name || "unknown",
        success: false,
        status: "invalid_provider_runner",
        error: "Invalid provider runner",
        rotation: null
      });
      continue;
    }

    try {
      const result = await provider.run(payload);

      const rotationCheck = shouldRotateKey(result?.key || null, result?.success ? null : result);

      let rotation = null;

      if (!result.success && rotationCheck.rotate) {
        rotation = rotateProviderKey(provider.name, result?.keyId || null);
      }

      attempts.push(buildAttempt(provider, result, {
        rotation: rotation
          ? {
              attempted: true,
              success: rotation.success,
              status: rotation.status,
              reason: rotation.reason || null,
              previousKeyId: rotation.previousKeyId || null,
              nextKeyId: rotation.keyId || null
            }
          : {
              attempted: false,
              reason: rotationCheck.reason
            }
      }));

      if (result.success) {
        return {
          success: true,
          type,
          provider: provider.name,
          result,
          attempts
        };
      }
    } catch (error) {
      const rotation = rotateProviderKey(provider.name);

      attempts.push({
        provider: provider.name,
        success: false,
        status: "provider_exception",
        error: error.message,
        keyStatus: null,
        rotation: {
          attempted: true,
          success: rotation.success,
          status: rotation.status,
          reason: rotation.reason || null,
          previousKeyId: null,
          nextKeyId: rotation.keyId || null
        }
      });
    }
  }

  return {
    success: false,
    type,
    provider: null,
    result: null,
    attempts
  };
}

module.exports = { runFallbackStack };
