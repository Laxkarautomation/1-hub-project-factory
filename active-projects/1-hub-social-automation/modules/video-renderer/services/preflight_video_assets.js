const fs = require("fs");
const path = require("path");
const outputRouter = require("../../channels/channel_output_router");

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
  const imagesBasePath = resolveProjectPath(outputRouter.getImageOutputPath(script.script_id));
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
