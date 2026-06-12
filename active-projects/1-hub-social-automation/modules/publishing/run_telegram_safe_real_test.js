const {
  savePublishingProviderSecrets
} = require("./services/publishing_credentials_service");

const {
  enableRealPublishing,
  disableRealPublishing
} = require("./services/publishing_provider_runtime_service");

const {
  enqueuePublishingJob,
  runNextPublishingJob
} = require("./services/publishing_service");

async function main() {
  savePublishingProviderSecrets({
    providerId: "telegram_bot_api",
    secrets: {
      botToken: "TEST_BOT_TOKEN_SAFE_MODE",
      chatId: "TEST_CHAT_ID_SAFE_MODE"
    }
  });

  enableRealPublishing("telegram", "telegram_bot_api");

  const enqueueResult = enqueuePublishingJob({
    channelId: "unraaz",
    platform: "telegram",
    providerId: "telegram_bot_api",
    contentType: "text",
    payload: {
      title: "Safe real publisher test",
      description: "This is safe mode. No HTTP request is sent."
    }
  });

  const publishResult = await runNextPublishingJob();

  disableRealPublishing("telegram", "telegram_bot_api");

  console.log(JSON.stringify({
    success: publishResult.success,
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
