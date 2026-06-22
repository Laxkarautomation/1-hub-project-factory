const path = require("path");
const { resolveChannelRuntime } = require("./channel_runtime_resolver");

function cleanSegment(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function getRuntime() {
  const runtime = resolveChannelRuntime();

  if (!runtime || runtime.success === false) {
    throw new Error("Channel output router failed: runtime resolver failed");
  }

  return runtime.runtime || runtime.channelRuntime || runtime;
}

function getRuntimeChannel(runtime) {
  return (
    runtime.channel ||
    runtime.activeChannel ||
    runtime.resolvedChannel ||
    runtime.config ||
    runtime
  );
}

function getChannelId(runtime) {
  const channel = getRuntimeChannel(runtime);

  return cleanSegment(
    channel.channelId ||
    channel.id ||
    channel.slug ||
    channel.name ||
    runtime.channelId ||
    runtime.activeChannelId
  );
}

function getOutputBasePath(runtime) {
  const channel = getRuntimeChannel(runtime);

  return cleanSegment(
    channel.outputBasePath ||
    runtime.outputBasePath
  );
}

function buildStoragePath(type) {
  const runtime = getRuntime();
  const channelId = getChannelId(runtime);

  if (!channelId) {
    console.log(JSON.stringify({ runtime }, null, 2));
    throw new Error("Channel output router failed: active channelId missing");
  }

  return path.join(process.cwd(), "storage", type, channelId);
}

function getVideoOutputPath() {
  const runtime = getRuntime();
  const outputBasePath = getOutputBasePath(runtime);

  if (outputBasePath) {
    return path.join(process.cwd(), outputBasePath);
  }

  return buildStoragePath("videos");
}

function getAudioOutputPath() {
  return buildStoragePath("audio");
}

function getImageOutputPath(scriptId = "") {
  const basePath = buildStoragePath("images");
  return scriptId ? path.join(basePath, cleanSegment(scriptId)) : basePath;
}

function getScriptOutputPath() {
  return buildStoragePath("scripts");
}

function getPublishingOutputPath() {
  return buildStoragePath("publishing");
}

function getAllOutputPaths(scriptId = "") {
  const runtime = getRuntime();

  return {
    channelId: getChannelId(runtime),
    video: getVideoOutputPath(),
    audio: getAudioOutputPath(),
    images: getImageOutputPath(scriptId),
    scripts: getScriptOutputPath(),
    publishing: getPublishingOutputPath(),
  };
}

module.exports = {
  getVideoOutputPath,
  getAudioOutputPath,
  getImageOutputPath,
  getScriptOutputPath,
  getPublishingOutputPath,
  getAllOutputPaths,
};
