async function runFallbackStack({ type, providers, payload }) {
  const attempts = [];

  for (const provider of providers) {
    if (!provider || typeof provider.run !== "function") {
      attempts.push({
        provider: provider?.name || "unknown",
        success: false,
        error: "Invalid provider runner"
      });
      continue;
    }

    try {
      const result = await provider.run(payload);

      attempts.push({
        provider: provider.name,
        success: !!result.success,
        error: result.error || null
      });

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
      attempts.push({
        provider: provider.name,
        success: false,
        error: error.message
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
