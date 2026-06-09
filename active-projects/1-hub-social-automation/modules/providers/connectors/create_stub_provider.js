function createStubProvider(name, requiredKeys = ["apiKey"]) {
  return {
    name,
    run: async (payload = {}, credentials = {}) => {
      const missing = requiredKeys.filter(key => !credentials?.[key]);

      if (missing.length > 0) {
        return {
          success: false,
          provider: name,
          error: `Missing credentials: ${missing.join(", ")}`
        };
      }

      return {
        success: false,
        provider: name,
        error: "Provider connector exists but real API call is not implemented yet",
        payload
      };
    }
  };
}

module.exports = { createStubProvider };
