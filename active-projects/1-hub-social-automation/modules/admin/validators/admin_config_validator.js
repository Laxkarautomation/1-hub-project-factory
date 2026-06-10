function validateAdminConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== "object") {
    errors.push("Admin config must be an object.");
    return { valid: false, errors, warnings };
  }

  if (!config.system) errors.push("Missing system config.");
  if (!config.providers) errors.push("Missing providers config.");
  if (!config.runtime) errors.push("Missing runtime config.");

  if (config.system && config.system.freeFirst !== true) {
    warnings.push("freeFirst is not true. Project rule expects free-first setup.");
  }

  if (config.system && config.system.allowPaidProviders === true) {
    warnings.push("Paid providers are allowed. Current project rule prefers free-first.");
  }

  if (config.providers) {
    for (const serviceName of Object.keys(config.providers)) {
      const service = config.providers[serviceName];

      if (!service.active) {
        errors.push(`Provider service '${serviceName}' missing active provider.`);
      }

      if (!Array.isArray(service.fallbackOrder)) {
        errors.push(`Provider service '${serviceName}' fallbackOrder must be array.`);
      }

      if (!service.providers || typeof service.providers !== "object") {
        errors.push(`Provider service '${serviceName}' providers must be object.`);
      }

      if (service.active && service.providers && !service.providers[service.active]) {
        errors.push(`Active provider '${service.active}' missing inside '${serviceName}'.`);
      }

      if (service.fallbackOrder && service.providers) {
        for (const providerName of service.fallbackOrder) {
          if (!service.providers[providerName]) {
            errors.push(`Fallback provider '${providerName}' missing inside '${serviceName}'.`);
          }
        }
      }
    }
  }

  if (config.runtime) {
    if (typeof config.runtime.maxRetries !== "number") {
      errors.push("runtime.maxRetries must be number.");
    }

    if (typeof config.runtime.timeoutMs !== "number") {
      errors.push("runtime.timeoutMs must be number.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = { validateAdminConfig };
