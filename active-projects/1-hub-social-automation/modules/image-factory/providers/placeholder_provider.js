const fs = require("fs");

function createPlaceholderImage(scene, outputPath) {
  if (fs.existsSync(outputPath)) {
    return {
      success: true,
      skipped: true,
      outputPath,
      provider: "placeholder",
      scene: scene.scene,
    };
  }

  return {
    success: false,
    skipped: false,
    outputPath,
    provider: "placeholder",
    scene: scene.scene,
    error: "No placeholder source configured for active channel",
  };
}

module.exports = { createPlaceholderImage };
