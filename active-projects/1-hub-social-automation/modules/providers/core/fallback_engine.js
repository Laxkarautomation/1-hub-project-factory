const {
  rotateProviderKey,
  shouldRotateKey
} = require("../runtime/key_rotation_engine");

const {
  trackProviderUsage
} = require("../usage/provider_usage_tracker");

function buildAttempt(provider, result, extra = {}) {
  return {
    provider: provider?.name || "unknown",
    success: !!result?.success,
    status: result?.status || null,
    error: result?.error || null,
    keyStatus: result?.keyStatus || null,
    rotation: extra.rotation || null,
    usage: extra.usage || null
  };
}

function trackAttemptUsage({ type, provider, result, durationMs, metadata = {} }) {
  try {
    return trackProviderUsage({
      provider: provider?.name || "unknown",
      type,
      result,
      keyId: result?.keyId || result?.key?.keyId || null,
      model: result?.model || null,
      durationMs,
      metadata
    });
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getProviderTimeoutMs(payload = {}) {
  return getPositiveInt(
    payload.providerTimeoutMs || process.env.IMAGE_PROVIDER_TIMEOUT_MS,
    45000
  );
}

function getMaxAttempts(providers = []) {
  return Math.min(
    providers.length,
    getPositiveInt(process.env.IMAGE_PROVIDER_MAX_ATTEMPTS, providers.length)
  );
}

async function runProviderWithTimeout(provider, payload, timeoutMs) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timedOut = false;
  let timer = null;

  const timeoutResult = new Promise((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      if (controller) controller.abort();
      resolve({
        success: false,
        provider: provider?.name || "unknown",
        status: "provider_timeout",
        error: `Provider timed out after ${timeoutMs}ms`
      });
    }, timeoutMs);

    if (timer.unref) timer.unref();
  });

  const providerPayload = controller
    ? { ...payload, signal: controller.signal }
    : payload;

  const providerResult = Promise.resolve(provider.run(providerPayload)).catch((error) => ({
    success: false,
    provider: provider?.name || "unknown",
    status: timedOut || error.name === "AbortError" ? "provider_timeout" : "provider_exception",
    error: timedOut
      ? `Provider timed out after ${timeoutMs}ms`
      : error.message
  }));

  const result = await Promise.race([providerResult, timeoutResult]);
  if (timer) clearTimeout(timer);
  return result;
}

async function runFallbackStack({ type, providers, payload }) {
  const attempts = [];
  const timeoutMs = getProviderTimeoutMs(payload);
  const maxAttempts = getMaxAttempts(providers);
  const activeProviders = providers.slice(0, maxAttempts);

  for (const provider of activeProviders) {
    if (!provider || typeof provider.run !== "function") {
      const invalidResult = {
        success: false,
        status: "invalid_provider_runner",
        error: "Invalid provider runner"
      };

      const usage = trackAttemptUsage({
        type,
        provider,
        result: invalidResult,
        durationMs: 0,
        metadata: {
          fallbackEngine: true
        }
      });

      attempts.push({
        provider: provider?.name || "unknown",
        success: false,
        status: "invalid_provider_runner",
        error: "Invalid provider runner",
        rotation: null,
        usage
      });
      continue;
    }

    const startedAt = Date.now();

    try {
      const result = await runProviderWithTimeout(provider, payload, timeoutMs);
      const durationMs = Date.now() - startedAt;

      const usage = trackAttemptUsage({
        type,
        provider,
        result,
        durationMs,
        metadata: {
          fallbackEngine: true
        }
      });

      const rotationCheck = shouldRotateKey(result?.key || null, result?.success ? null : result);

      let rotation = null;

      if (!result.success && rotationCheck.rotate) {
        rotation = rotateProviderKey(provider.name, result?.keyId || null);
      }

      attempts.push(buildAttempt(provider, result, {
        usage,
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
      const durationMs = Date.now() - startedAt;

      const errorResult = {
        success: false,
        status: "provider_exception",
        error: error.message
      };

      const usage = trackAttemptUsage({
        type,
        provider,
        result: errorResult,
        durationMs,
        metadata: {
          fallbackEngine: true,
          exception: true
        }
      });

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
        },
        usage
      });
    }
  }

  return {
    success: false,
    type,
    provider: null,
    result: null,
    attempts,
    maxAttempts
  };
}

module.exports = { runFallbackStack };
