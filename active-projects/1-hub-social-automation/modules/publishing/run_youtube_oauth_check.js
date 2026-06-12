const {
  validateYouTubeCredentials,
  refreshYouTubeAccessToken,
  getYouTubeChannelStatus
} = require("./providers/youtube/youtube_oauth_service");

async function main() {
  const live =
    process.argv.includes("--live");

  const validation =
    validateYouTubeCredentials();

  const token =
    await refreshYouTubeAccessToken(
      "youtube_api",
      {
        safeMode: !live
      }
    );

  const channel =
    await getYouTubeChannelStatus(
      "youtube_api",
      {
        safeMode: !live
      }
    );

  console.log(
    JSON.stringify(
      {
        success:
          validation.success &&
          token.success &&
          channel.success,
        validation,
        token,
        channel
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exit(1);
});
