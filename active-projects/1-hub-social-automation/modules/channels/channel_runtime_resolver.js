const { loadActiveChannelConfig, loadChannelConfig } = require("./channel_config_loader");

function buildRuntimeChannel(channel) {
  return {
    channelId: channel.channelId,
    name: channel.name,
    status: channel.status,
    platforms: channel.platforms || [],
    niche: channel.niche || null,
    language: channel.language || "hinglish",
    outputBasePath: channel.outputBasePath || `storage/videos/${channel.channelId}`,
    contentStyle: channel.contentStyle || {},
    publishing: channel.publishing || {},
    metadata: channel.metadata || {}
  };
}

function resolveChannelRuntime(channelId = null, options = {}) {
  const result = channelId
    ? loadChannelConfig(channelId, options)
    : loadActiveChannelConfig(options);

  if (!result.success) {
    return {
      success: false,
      status: result.status,
      reason: result.reason,
      channel: null
    };
  }

  return {
    success: true,
    status: "channel_runtime_resolved",
    channel: buildRuntimeChannel(result.channel)
  };
}

module.exports = {
  resolveChannelRuntime,
  buildRuntimeChannel
};
