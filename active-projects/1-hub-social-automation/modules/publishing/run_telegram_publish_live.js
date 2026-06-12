const {
  enqueuePublishingJob,
  runNextPublishingJob
} = require("./services/publishing_service");

const {
  enableRealPublishing,
  disableRealPublishing
} = require("./services/publishing_provider_runtime_service");

async function main() {
  const live = process.argv.includes("--live");

  if (live) {
    enableRealPublishing("telegram", "telegram_bot_api");
  }

  const enqueueResult = enqueuePublishingJob({
    channelId: "unraaz",
    platform: "telegram",
    providerId: "telegram_bot_api",
    contentType: "text",
    payload: {
      title: "1 Hub Telegram publish test",
      description: live
        ? "LIVE mode requested from publishing pipeline."
        : "SAFE mode test. No message will be sent."
    }
  });

  const publishResult = await runNextPublishingJob();

  if (!live) {
    disableRealPublishing("telegram", "telegram_bot_api");
  }

  console.log(JSON.stringify({
    success: publishResult.success,
    live,
    enqueueResult,
    publishResult
  }, null, 2));

  process.exit(publishResult.success ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message,
    stack: error.stack
  }, null, 2));
  process.exit(1);
});
