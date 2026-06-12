const crypto = require("crypto");
const { upsertPack } = require("../registry/content_pack_store");
const { detectAssets, buildPublishingMetadata } = require("../registry/content_pack_loader");

function idFrom(input) {
  return "cp_" + crypto.createHash("sha1").update(JSON.stringify(input)).digest("hex").slice(0, 12);
}

function createContentPackFromWorkflow(workflowOutput = {}, options = {}) {
  const channelId = options.channelId || workflowOutput.channelId || "default";
  const assets = detectAssets({
    video: workflowOutput.videoPath || workflowOutput.finalVideoPath,
    images: workflowOutput.imagePaths || workflowOutput.images,
    voice: workflowOutput.voicePath || workflowOutput.audioPath,
    script: workflowOutput.scriptPath,
    thumbnail: workflowOutput.thumbnailPath
  });

  const pack = {
    contentPackId: workflowOutput.contentPackId || idFrom({ channelId, workflowOutput }),
    channelId,
    status: assets.some(a => a.type === "video") ? "publishable" : "draft",
    source: "workflow",
    title: workflowOutput.title || workflowOutput.scriptTitle || "Untitled Content",
    description: workflowOutput.description || workflowOutput.summary || "",
    hashtags: workflowOutput.hashtags || [],
    providerTargets: options.providerTargets || workflowOutput.providerTargets || ["telegram", "youtube"],
    workflowRunId: workflowOutput.workflowRunId || null,
    assets
  };

  pack.publishingMetadata = buildPublishingMetadata(pack);
  return upsertPack(pack);
}

module.exports = { createContentPackFromWorkflow };
