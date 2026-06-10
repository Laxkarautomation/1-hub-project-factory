const { getChannelById } = require("./channel_store");
const { getActiveChannelId } = require("./active_channel_selector");

function loadChannelConfig(channelId, options = {}) {
  if (!channelId) {
    return {
      success: false,
      status: "no_channel_id",
      reason: "Channel id is required",
      channel: null
    };
  }

  const result = getChannelById(channelId, options.channelStorePath);

  if (!result.success) {
    return {
      success: false,
      status: "channel_store_error",
      reason: result.error,
      channel: null
    };
  }

  if (!result.channel) {
    return {
      success: false,
      status: "channel_not_found",
      reason: "Channel not found",
      channel: null
    };
  }

  return {
    success: true,
    status: "channel_config_loaded",
    channel: result.channel
  };
}

function loadActiveChannelConfig(options = {}) {
  const activeChannel = getActiveChannelId(options.activeChannelPath);

  if (!activeChannel.success) {
    return {
      success: false,
      status: activeChannel.status,
      reason: activeChannel.reason,
      channel: null
    };
  }

  return loadChannelConfig(activeChannel.channelId, options);
}

module.exports = {
  loadChannelConfig,
  loadActiveChannelConfig
};
