const {
  savePublishingProviderSecrets
} = require("./services/publishing_credentials_service");

const {
  setPublishingProviderRuntime
} = require("./services/publishing_provider_runtime_service");

const {
  enqueuePublishingJob,
  runNextPublishingJob
} = require("./services/publishing_service");

async function main() {
  savePublishingProviderSecrets({
    providerId: "youtube_api",
    secrets: {
      clientId: "TEST_YOUTUBE_CLIENT_ID",
      clientSecret: "TEST_YOUTUBE_CLIENT_SECRET",
      refreshToken: "TEST_YOUTUBE_REFRESH_TOKEN"
    }
  });

  setPublishingProviderRuntime("youtube", "youtube_api", {
    enabled: true,
    realPublishing: true,
    safeMode: true
  });

  const enqueueResult = enqueuePublishingJob({
    channelId: "unraaz",
    platform: "youtube",
    providerId: "youtube_api",
    contentType: "video",
    payload: {
      title: "YouTube safe upload test",
      description: "Safe mode enabled. No upload should be sent.",
      filePath: "storage/videos/test.mp4",
      privacyStatus: "private",
      tags: ["unraaz", "test"]
    }
  });

  const publishResult = await runNextPublishingJob();

  setPublishingProviderRuntime("youtube", "youtube_api", {
    enabled: false,
    realPublishing: false,
    safeMode: true
  });

  console.log(JSON.stringify({
    success: publishResult.success,
    expectedPath: "youtube_upload_safe_mode",
    enqueueResult,
    publishResult
  }, null, 2));

  process.exit(
    publishResult.success &&
    publishResult.result?.safeMode === true
      ? 0
      : 1
  );
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message,
    stack: error.stack
  }, null, 2));
  process.exit(1);
});
