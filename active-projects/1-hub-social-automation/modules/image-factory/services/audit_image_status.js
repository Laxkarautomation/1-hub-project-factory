const fs = require("fs");
const path = require("path");

function auditImageStatus(script) {
  const scriptId = script.script_id;
  const imageDir = path.join(process.cwd(), "storage/images/unraaz", scriptId);

  return script.scenes.map(scene => {
    const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);
    const exists = fs.existsSync(imagePath);
    const size = exists ? fs.statSync(imagePath).size : 0;

    return {
      script_id: scriptId,
      scene: scene.scene,
      image_path: `storage/images/unraaz/${scriptId}/scene_${scene.scene}.jpg`,
      exists,
      size_bytes: size,
      status: exists && size > 1000 ? "ready" : "missing",
      prompt: scene.image_prompt
    };
  });
}

module.exports = { auditImageStatus };
