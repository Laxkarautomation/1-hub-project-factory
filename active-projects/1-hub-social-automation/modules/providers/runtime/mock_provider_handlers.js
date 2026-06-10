const mockHandlers = {
  mock: async ({ serviceName, providerName, providerConfig, payload }) => {
    return {
      success: true,
      serviceName,
      providerName,
      providerConfig: {
        name: providerName,
        model: providerConfig.model || null,
        type: providerConfig.type || null
      },
      output: {
        message: `Mock provider executed for ${serviceName}`,
        input: payload
      }
    };
  },

  local: async ({ serviceName, providerName, providerConfig, payload }) => {
    return {
      success: true,
      serviceName,
      providerName,
      providerConfig: {
        name: providerName,
        model: providerConfig.model || null,
        type: providerConfig.type || null
      },
      output: {
        message: `Local provider executed for ${serviceName}`,
        input: payload
      }
    };
  }
};

module.exports = { mockHandlers };
