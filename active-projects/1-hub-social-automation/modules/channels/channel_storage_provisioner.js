const fs = require("fs");
const outputRouter = require("./channel_output_router");

function ensureDir(label, dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });

  return {
    label,
    path: dirPath,
    exists: fs.existsSync(dirPath),
  };
}

function ensureVideoStorage() {
  return ensureDir("video", outputRouter.getVideoOutputPath());
}

function ensureAudioStorage() {
  return ensureDir("audio", outputRouter.getAudioOutputPath());
}

function ensureImageStorage() {
  return ensureDir("images", outputRouter.getImageOutputPath());
}

function ensureScriptStorage() {
  return ensureDir("scripts", outputRouter.getScriptOutputPath());
}

function ensurePublishingStorage() {
  return ensureDir("publishing", outputRouter.getPublishingOutputPath());
}

function ensureChannelStorage() {
  const paths = outputRouter.getAllOutputPaths();

  return {
    channelId: paths.channelId,
    created: [
      ensureVideoStorage(),
      ensureAudioStorage(),
      ensureImageStorage(),
      ensureScriptStorage(),
      ensurePublishingStorage(),
    ],
  };
}

module.exports = {
  ensureVideoStorage,
  ensureAudioStorage,
  ensureImageStorage,
  ensureScriptStorage,
  ensurePublishingStorage,
  ensureChannelStorage,
};
