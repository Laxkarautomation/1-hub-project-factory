const path = require("path");
const outputRouter = require("./channel_output_router");
const storageProvisioner = require("./channel_storage_provisioner");

function getWorkspace(scriptId = "") {
  storageProvisioner.ensureChannelStorage();

  const paths = outputRouter.getAllOutputPaths(scriptId);

  if (scriptId) {
    const fs = require("fs");
    fs.mkdirSync(paths.images, { recursive: true });
  }

  return {
    channelId: paths.channelId,

    getVideosPath() {
      return paths.video;
    },

    getAudioPath(filename = "") {
      return filename ? path.join(paths.audio, filename) : paths.audio;
    },

    getImagesPath(sceneOrScriptId = "") {
      if (!sceneOrScriptId) {
        return paths.images;
      }

      return path.join(paths.images, sceneOrScriptId);
    },

    getScriptsPath(filename = "") {
      return filename ? path.join(paths.scripts, filename) : paths.scripts;
    },

    getPublishingPath(filename = "") {
      return filename ? path.join(paths.publishing, filename) : paths.publishing;
    },

    getAllPaths() {
      return paths;
    },
  };
}

module.exports = {
  getWorkspace,
};
