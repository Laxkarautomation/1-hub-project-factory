const fs = require("fs");
const path = require("path");

const DEFAULT_ACTIVE_CHANNEL_PATH = path.join(
  process.cwd(),
  "modules/channels/storage/active_channel.json"
);

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    return {
      error: true,
      message: error.message,
      data: fallback
    };
  }
}

function getActiveChannelId(activeChannelPath = DEFAULT_ACTIVE_CHANNEL_PATH) {
  const activeConfig = readJson(activeChannelPath, {});

  if (activeConfig.error) {
    return {
      success: false,
      status: "active_channel_config_error",
      reason: activeConfig.message,
      channelId: null
    };
  }

  if (!activeConfig.channelId) {
    return {
      success: false,
      status: "no_active_channel",
      reason: "No active channel selected",
      channelId: null
    };
  }

  return {
    success: true,
    status: "active_channel_found",
    channelId: activeConfig.channelId,
    raw: activeConfig
  };
}

module.exports = {
  DEFAULT_ACTIVE_CHANNEL_PATH,
  getActiveChannelId
};
