const {
  validateTelegramProvider,
  checkTelegramConnection
} = require("./providers/telegram/telegram_real_publisher");

const {
  validateYouTubeCredentials,
  refreshYouTubeAccessToken,
  getYouTubeChannelStatus
} = require("./providers/youtube/youtube_oauth_service");

const {
  validateYouTubeUploadJob,
  buildYouTubeMetadata
} = require("./providers/youtube/youtube_upload_service");

async function main() {
  const telegramValidation = await validateTelegramProvider();
  const telegramConnection = await checkTelegramConnection("telegram_bot_api", {
    safeMode: true
  });

  const youtubeValidation = validateYouTubeCredentials();
  const youtubeToken = await refreshYouTubeAccessToken("youtube_api", {
    safeMode: true
  });
  const youtubeChannel = await getYouTubeChannelStatus("youtube_api", {
    safeMode: true
  });

  const sampleYoutubeJob = {
    jobId: "phase21_youtube_validation",
    platform: "youtube",
    contentType: "video",
    payload: {
      title: "Phase 21 YouTube validation",
      description: "Metadata validation only",
      filePath: "storage/videos/test.mp4",
      privacyStatus: "private",
      tags: ["phase21", "test"]
    }
  };

  const youtubeUploadValidation = validateYouTubeUploadJob(sampleYoutubeJob);
  const youtubeMetadata = buildYouTubeMetadata(sampleYoutubeJob);

  const result = {
    success: true,
    telegram: {
      validation: telegramValidation,
      connection: telegramConnection
    },
    youtube: {
      credentials: youtubeValidation,
      token: {
        ...youtubeToken,
        accessToken: youtubeToken.accessToken ? "***masked***" : null
      },
      channel: youtubeChannel,
      uploadValidation: youtubeUploadValidation,
      metadata: youtubeMetadata
    }
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message,
    stack: error.stack
  }, null, 2));
  process.exit(1);
});
