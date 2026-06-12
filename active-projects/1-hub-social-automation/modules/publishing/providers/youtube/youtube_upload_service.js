const fs = require("fs");
const path = require("path");
const { requestJson } = require("../../utils/http_client");
const {
  refreshYouTubeAccessToken,
  validateYouTubeCredentials
} = require("./youtube_oauth_service");

function validateYouTubeUploadJob(job = {}) {
  const missing = [];
  const warnings = [];

  if (!job.payload?.title) missing.push("payload.title");

  const filePath =
    job.payload?.filePath ||
    job.payload?.videoPath ||
    null;

  if (!filePath) {
    warnings.push("payload.filePath/videoPath missing");
  } else if (!fs.existsSync(path.resolve(process.cwd(), filePath))) {
    warnings.push(`video file not found: ${filePath}`);
  }

  return {
    success: missing.length === 0,
    missing,
    warnings,
    filePath,
    title: job.payload?.title || null,
    description: job.payload?.description || "",
    privacyStatus: job.payload?.privacyStatus || "private",
    tags: Array.isArray(job.payload?.tags)
      ? job.payload.tags
      : []
  };
}

function buildYouTubeMetadata(job = {}) {
  const validation = validateYouTubeUploadJob(job);

  return {
    snippet: {
      title: validation.title || "Untitled",
      description: validation.description || "",
      tags: validation.tags || [],
      categoryId: job.payload?.categoryId || "22"
    },
    status: {
      privacyStatus: validation.privacyStatus || "private",
      selfDeclaredMadeForKids:
        job.payload?.madeForKids === true
          ? true
          : false
    }
  };
}

async function uploadYouTubeVideo(job, options = {}) {
  const providerId = options.providerId || "youtube_api";

  const credentialStatus =
    validateYouTubeCredentials(providerId);

  if (!credentialStatus.success) {
    return {
      success: false,
      providerId,
      platform: "youtube",
      jobId: job.jobId,
      error: "YouTube credentials missing",
      missing: credentialStatus.missing
    };
  }

  const validation = validateYouTubeUploadJob(job);

  if (!validation.success) {
    return {
      success: false,
      providerId,
      platform: "youtube",
      jobId: job.jobId,
      error: "YouTube upload job validation failed",
      validation
    };
  }

  const metadata =
    buildYouTubeMetadata(job);

  if (options.safeMode !== false) {
    return {
      success: true,
      providerId,
      platform: "youtube",
      jobId: job.jobId,
      realPublish: false,
      dryRun: true,
      safeMode: true,
      message: "YouTube upload ready; safe mode active, no upload sent",
      validation,
      metadata,
      publishedAt: new Date().toISOString()
    };
  }

  const token =
    await refreshYouTubeAccessToken(
      providerId,
      {
        safeMode: false
      }
    );

  if (!token.success) {
    return token;
  }

  return {
    success: false,
    providerId,
    platform: "youtube",
    jobId: job.jobId,
    realPublish: true,
    dryRun: false,
    safeMode: false,
    error: "Direct YouTube resumable upload not enabled yet",
    note: "OAuth token refresh is ready; resumable multipart upload will be enabled after final live verification.",
    validation,
    metadata
  };
}

module.exports = {
  validateYouTubeUploadJob,
  buildYouTubeMetadata,
  uploadYouTubeVideo
};
