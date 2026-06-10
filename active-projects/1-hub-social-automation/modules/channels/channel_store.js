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

function saveChannels(channels, channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  fs.writeFileSync(
    channelStorePath,
    JSON.stringify(channels, null, 2)
  );

  return true;
}

function createChannel(channel, channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  const store = loadChannels(channelStorePath);
  const channels = Array.isArray(store.raw) ? [...store.raw] : [];
  const channelId = channel.channelId || channel.id;

  const exists = channels.some(existing => {
    const existingId = existing.channelId || existing.id;
    return existingId === channelId;
  });

  if (exists) {
    return {
      success: false,
      status: "channel_already_exists",
      reason: "Channel already exists",
      channelId
    };
  }

  channels.push(channel);
  saveChannels(channels, channelStorePath);

  return {
    success: true,
    status: "channel_created",
    channel
  };
}

function updateChannel(channelId, updates, channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  const store = loadChannels(channelStorePath);

  const channels = store.raw.map(channel => {
    const id = channel.channelId || channel.id;

    if (id !== channelId) {
      return channel;
    }

    return {
      ...channel,
      ...updates
    };
  });

  saveChannels(channels, channelStorePath);

  return {
    success: true,
    channelId
  };
}

function deleteChannel(channelId, channelStorePath = DEFAULT_CHANNEL_STORE_PATH) {
  const store = loadChannels(channelStorePath);

  const channels = store.raw.filter(channel => {
    const id = channel.channelId || channel.id;
    return id !== channelId;
  });

  saveChannels(channels, channelStorePath);

  return {
    success: true,
    channelId
  };
}
module.exports = {
  DEFAULT_CHANNEL_STORE_PATH,
  loadChannels,
  getEnabledChannels,
  getChannelById,
  saveChannels,
  createChannel,
  updateChannel,
  deleteChannel
};
