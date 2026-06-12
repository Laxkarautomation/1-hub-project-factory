const fs = require("fs");
const path = require("path");

function exists(p) {
  return p && fs.existsSync(path.resolve(process.cwd(), p));
}

function detectAssets(input = {}) {
  const assets = [];
  for (const [type, value] of Object.entries(input)) {
    if (Array.isArray(value)) value.forEach(v => exists(v) && assets.push({ type, path: v }));
    else if (exists(value)) assets.push({ type, path: value });
  }
  return assets;
}

function buildPublishingMetadata(pack) {
  return {
    title: pack.title || pack.scriptTitle || `Content Pack ${pack.contentPackId}`,
    description: pack.description || pack.summary || "",
    hashtags: pack.hashtags || [],
    channelId: pack.channelId,
    providerTargets: pack.providerTargets || [],
    assets: pack.assets || []
  };
}

module.exports = { detectAssets, buildPublishingMetadata };
