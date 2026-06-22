const { resolveChannelRuntime } = require("./channel_runtime_resolver");

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getActiveChannelIdentity() {
  const runtimeResult = resolveChannelRuntime();
  const runtime = runtimeResult.runtime || runtimeResult.channelRuntime || runtimeResult;
  const channel = runtime.channel || runtime.activeChannel || runtime.resolvedChannel || runtime.config || runtime;

  const channelId = cleanId(
    channel.channelId ||
    channel.id ||
    channel.slug ||
    runtime.channelId ||
    runtime.activeChannelId ||
    "default_channel"
  );

  return {
    channelId,
    scriptPrefix: `${channelId}_script`,
    ideaPrefix: `${channelId}_idea`,
    contentPrefix: `${channelId}_content`,
  };
}

function buildChannelSequenceId(type, index) {
  const identity = getActiveChannelIdentity();
  const prefixMap = {
    script: identity.scriptPrefix,
    idea: identity.ideaPrefix,
    content: identity.contentPrefix,
  };

  const prefix = prefixMap[type] || `${identity.channelId}_${cleanId(type)}`;
  return `${prefix}_${String(index + 1).padStart(3, "0")}`;
}

module.exports = {
  cleanId,
  getActiveChannelIdentity,
  buildChannelSequenceId,
};
