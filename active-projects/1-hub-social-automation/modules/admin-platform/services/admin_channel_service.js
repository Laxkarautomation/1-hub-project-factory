const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const CHANNELS_FILE = path.join(ROOT, "modules/channels/storage/channels.json");
const ACTIVE_FILE = path.join(ROOT, "modules/channels/storage/active_channel.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function listChannels() {
  const channels = readJson(CHANNELS_FILE, []);
  const active = readJson(ACTIVE_FILE, {});

  return {
    success: true,
    active,
    channels
  };
}

function getChannel(channelId) {
  const channels = readJson(CHANNELS_FILE, []);
  const channel = channels.find((item) => item.channelId === channelId);

  if (!channel) {
    return {
      success: false,
      error: "Channel not found",
      channelId
    };
  }

  return {
    success: true,
    channel
  };
}

function setActiveChannel(channelId) {
  const channels = readJson(CHANNELS_FILE, []);
  const exists = channels.some((item) => item.channelId === channelId);

  if (!exists) {
    return {
      success: false,
      error: "Cannot activate unknown channel",
      channelId
    };
  }

  const active = {
    channelId,
    updatedAt: new Date().toISOString()
  };

  writeJson(ACTIVE_FILE, active);

  return {
    success: true,
    active
  };
}

function saveChannel(input) {
  if (!input || !input.channelId) {
    return {
      success: false,
      error: "channelId is required"
    };
  }

  const channels = readJson(CHANNELS_FILE, []);
  const index = channels.findIndex((item) => item.channelId === input.channelId);

  const normalized = {
    channelId: input.channelId,
    name: input.name || input.channelId,
    brand: input.brand || input.name || input.channelId,
    status: input.status || "active",
    platforms: Array.isArray(input.platforms) ? input.platforms : [],
    niche: input.niche || "",
    language: input.language || "hinglish",
    outputBasePath: input.outputBasePath || `storage/videos/${input.channelId}`,
    contentStyle: input.contentStyle || {
      tone: "default",
      format: "short_video",
      aspectRatio: "9:16"
    },
    publishing: input.publishing || {},
    metadata: {
      ...(input.metadata || {}),
      updatedBy: "admin-platform",
      updatedAt: new Date().toISOString()
    }
  };

  if (index >= 0) {
    channels[index] = {
      ...channels[index],
      ...normalized
    };
  } else {
    channels.push({
      ...normalized,
      metadata: {
        ...normalized.metadata,
        createdBy: "admin-platform",
        createdAt: new Date().toISOString()
      }
    });
  }

  writeJson(CHANNELS_FILE, channels);

  return {
    success: true,
    channel: normalized,
    totalChannels: channels.length
  };
}

function getChannelRuntimePreview(channelId) {
  const result = getChannel(channelId);

  if (!result.success) return result;

  const channel = result.channel;

  return {
    success: true,
    channelId,
    runtime: {
      active: readJson(ACTIVE_FILE, {}),
      outputBasePath: channel.outputBasePath,
      platforms: channel.platforms,
      language: channel.language,
      contentStyle: channel.contentStyle,
      workspace: {
        videos: channel.outputBasePath,
        reports: "storage/reports/content-workflow",
        workflows: "storage/workflows"
      }
    }
  };
}

module.exports = {
  listChannels,
  getChannel,
  setActiveChannel,
  saveChannel,
  getChannelRuntimePreview
};
