const fs = require("fs");
const path = require("path");

const DEFAULT_CHANNEL_STORE_PATH = path.join(
  process.cwd(),
  "modules/channels/storage/channels.json"
);

function readJson(filePath, fallback = []) {
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

function normalizeChannel(channel, index) {
  return {
    channelId: channel.channelId || channel.id || `channel_${index + 1}`,
    name: channel.name || channel.channelName || "Untitled Channel",
    brand: channel.brand || null,
    platforms: Array.isArray(channel.platforms) ? channel.platforms : [],
    status: channel.status || "inactive",
    niche: channel.niche || null,
    language: channel.language || "hinglish",
    outputBasePath: channel.outputBasePath || null,
    metadata: channel.metadata || {},
    raw: channel
  };
}

function normalizeChannels(rawChannels) {
  const channels = Array.isArray(rawChannels) ? rawChannels : [];
  return channels.map((channel, index) => normalizeChannel(channel, index));
}

function loadChannels(channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  const rawChannels = readJson(channelStorePath, []);

  if (rawChannels.error) {
    return {
      success: false,
      error: rawChannels.message,
      channels: [],
      channelStorePath
    };
  }

  return {
    success: true,
    channels: normalizeChannels(rawChannels),
    raw: rawChannels,
    channelStorePath
  };
}

function getEnabledChannels(channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  const store = loadChannels(channelStorePath);

  return {
    ...store,
    channels: store.channels.filter(channel => channel.status === "active")
  };
}

function getChannelById(channelId, channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  const store = loadChannels(channelStorePath);

  return {
    ...store,
    channel: store.channels.find(channel => channel.channelId === channelId) || null
  };
}

module.exports = {
  DEFAULT_CHANNEL_STORE_PATH,
  loadChannels,
  getEnabledChannels,
  getChannelById
};
