const fs = require("fs");
const path = require("path");

function checkVideoAssets(script) {
  const issues = [];

  if (!fs.existsSync(script.voice_file)) {
    issues.push({
      type: "missing_audio",
      path: script.voice_file
    });
  }

  for (const scene of script.scenes || []) {
    const imagePath = path.join(
      process.cwd(),
      "storage/images/unraaz",
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
