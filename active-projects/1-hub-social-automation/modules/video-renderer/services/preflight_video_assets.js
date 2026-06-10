const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../../channels/channel_workspace_resolver");

function resolveProjectPath(inputPath) {
  if (!inputPath) return inputPath;

  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  const cwd = process.cwd();

  if (inputPath.startsWith("workspaces/") || inputPath.includes("/workspaces/")) {
    return path.resolve("/", inputPath);
  }

  return path.join(cwd, inputPath);
}

function checkVideoAssets(script) {
  const issues = [];
  const workspace = workspaceResolver.getWorkspace();
  const imagesBasePath = resolveProjectPath(workspace.getImagesPath());
  const audioPath = resolveProjectPath(script.voice_file);

  if (!fs.existsSync(audioPath)) {
    issues.push({
      type: "missing_audio",
      path: audioPath
    });
  }

  for (const scene of script.scenes || []) {
    const imagePath = path.join(
      imagesBasePath,
      script.script_id,
      `scene_${scene.scene}.jpg`
    );

    const exists = fs.existsSync(imagePath);
    const size = exists ? fs.statSync(imagePath).size : 0;

    if (!exists || size < 1000) {
      issues.push({
        type: "missing_image",
        scene: scene.scene,
        path: imagePath
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

module.exports = { checkVideoAssets };
