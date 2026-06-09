const fs = require("fs");
const path = require("path");

function createPlaceholderImage(scene, outputPath) {
  const existingFallback = path.join(
    process.cwd(),
    "storage/images/unraaz",
    scene.script_id || "",
    `scene_${scene.scene}.jpg`
  );

  if (fs.existsSync(existingFallback) && fs.statSync(existingFallback).size > 1000) {
    fs.copyFileSync(existingFallback, outputPath);
    return { success: true, provider: "placeholder", outputPath };
  }

  return {
    success: false,
    provider: "placeholder",
    error: "No valid placeholder image found"
  };
}

module.exports = { createPlaceholderImage };
