const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../../channels/channel_workspace_resolver");

function auditImageStatus(script) {
  const scriptId = script.script_id;
  const workspace = workspaceResolver.getWorkspace(scriptId);
  const imageDir = workspace.getImagesPath();

  return script.scenes.map(scene => {
    const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);
    const exists = fs.existsSync(imagePath);
    const size = exists ? fs.statSync(imagePath).size : 0;

    return {
      script_id: scriptId,
      scene: scene.scene,
      image_path: path.join(imageDir, `scene_${scene.scene}.jpg`),
      exists,
      size_bytes: size,
      status: exists && size > 1000 ? "ready" : "missing",
      prompt: scene.image_prompt
    };
  });
}

module.exports = { auditImageStatus };
