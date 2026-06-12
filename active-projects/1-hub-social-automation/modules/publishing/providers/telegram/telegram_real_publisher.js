const { getProviderSecrets } = require("../../secrets/publishing_secret_store");

async function publishTelegram(job, config = {}) {
  const secrets = getProviderSecrets(config.providerId || "telegram_bot_api");

  if (!secrets.botToken || !secrets.chatId) {
    return {
      success: false,
      realPublish: true,
      providerId: config.providerId || "telegram_bot_api",
      platform: "telegram",
      jobId: job.jobId,
      error: "Telegram botToken/chatId missing"
    };
  }

  return {
    success: true,
    realPublish: false,
    dryRun: true,
    providerId: config.providerId || "telegram_bot_api",
    platform: "telegram",
    jobId: job.jobId,
    message: "Telegram real publisher configured but HTTP send is disabled in safe mode",
    targetChatId: String(secrets.chatId).slice(0, 3) + "***",
    publishedAt: new Date().toISOString()
  };
}

module.exports = {
  publishTelegram
};
