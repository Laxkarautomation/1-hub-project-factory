const { loadChannels, getEnabledChannels } = require("./channel_store");

function validateChannel(channel) {
  const errors = [];

  if (!channel.channelId) errors.push("channelId is required");
  if (!channel.name) errors.push("name is required");
  if (!Array.isArray(channel.platforms)) errors.push("platforms must be an array");
  if (!channel.status) errors.push("status is required");

  return {
    valid: errors.length === 0,
    errors
  };
}

function loadChannelRegistry(options = {}) {
  const store = loadChannels(options.channelStorePath);

  if (!store.success) {
    return {
      success: false,
      error: store.error,
      channels: []
    };
  }

  const channels = store.channels.map(channel => ({
    ...channel,
    validation: validateChannel(channel)
  }));

  return {
    success: true,
    channels,
    totalChannels: channels.length,
    activeChannels: channels.filter(channel => channel.status === "active").length
  };
}

function getActiveChannelRegistry(options = {}) {
  const store = getEnabledChannels(options.channelStorePath);

  return {
    ...store,
    totalChannels: store.channels.length
  };
}

module.exports = {
  validateChannel,
  loadChannelRegistry,
  getActiveChannelRegistry
};
