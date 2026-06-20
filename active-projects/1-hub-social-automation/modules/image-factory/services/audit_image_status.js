const fs = require("fs");
const path = require("path");
const workspaceResolver = require("../../channels/channel_workspace_resolver");

function scoreFileSize(bytes = 0) {
  if (bytes <= 0) return 0;
  if (bytes >= 1000000) return 100;
  if (bytes >= 500000) return 80;
  if (bytes >= 200000) return 60;
  if (bytes >= 1000) return 30;
  return 10;
}

function inferFormat(filePath = "") {
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  if (!ext) return "unknown";
  return ext;
}

function scoreFormat(format = "") {
  return ["jpg", "jpeg", "png", "webp"].includes(String(format).toLowerCase()) ? 100 : 30;
}

function scorePresence(exists, size) {
  if (!exists) return 0;
  if (size <= 1000) return 20;
  return 100;
}

function computeQualityScore({ exists, size_bytes, format }) {
  const presenceScore = scorePresence(exists, size_bytes);
  const sizeScore = scoreFileSize(size_bytes);
  const formatScore = scoreFormat(format);

  if (!exists) return 0;

  return Math.round(
    presenceScore * 0.45 +
    sizeScore * 0.35 +
    formatScore * 0.20
  );
}

function qualityBand(score = 0) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "usable";
  if (score >= 30) return "weak";
  return "failed";
}

function auditImageStatus(script) {
  const scriptId = script.script_id || script.scriptId;
  const workspace = workspaceResolver.getWorkspace(scriptId);
  const imageDir = workspace.getImagesPath();

  return (script.scenes || []).map(scene => {
    const imagePath = path.join(imageDir, `scene_${scene.scene}.jpg`);
    const exists = fs.existsSync(imagePath);
    const size = exists ? fs.statSync(imagePath).size : 0;
    const format = inferFormat(imagePath);
    const qualityScore = computeQualityScore({
      exists,
      size_bytes: size,
      format
    });

    const approved = qualityScore >= 70;

    return {
      script_id: scriptId,
      scene: scene.scene,
      image_path: imagePath,
      exists,
      size_bytes: size,
      format,
      presence_score: scorePresence(exists, size),
      size_score: scoreFileSize(size),
      format_score: scoreFormat(format),
      quality_score: qualityScore,
      quality_band: qualityBand(qualityScore),
      approved,
      status: approved ? "ready" : exists ? "needs_review" : "missing",
      prompt: scene.image_prompt || "",
      narration: scene.narration || ""
    };
  });
}

function summarizeImageAudit(audit = []) {
  const total = audit.length;
  const approved = audit.filter(x => x.approved).length;
  const rejected = total - approved;
  const missing = audit.filter(x => !x.exists).length;
  const averageQuality = total
    ? Math.round(audit.reduce((sum, x) => sum + (x.quality_score || 0), 0) / total)
    : 0;

  return {
    total_images: total,
    approved,
    rejected,
    missing,
    average_quality: averageQuality,
    status: rejected === 0 ? "image_quality_passed" : "image_quality_needs_review"
  };
}

module.exports = {
  auditImageStatus,
  summarizeImageAudit,
  scoreFileSize,
  scoreFormat,
  computeQualityScore
};
