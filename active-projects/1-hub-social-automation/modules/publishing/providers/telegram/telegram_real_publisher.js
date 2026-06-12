const { getProviderSecrets } = require("../../secrets/publishing_secret_store");
const {
  normalizeText,
  validateTelegramSecrets,
  validateTelegramJob,
  sendTelegramMessage,
  getTelegramMe
} = require("./telegram_api_client");

function maskChatId(chatId) {
  if (!chatId) return null;
  const text = String(chatId);
  if (text.length <= 4) return "***";
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
}

async function validateTelegramProvider(providerId = "telegram_bot_api") {
  const secrets = getProviderSecrets(providerId);
  const secretValidation = validateTelegramSecrets(secrets);

  if (!secretValidation.success) {
    return {
      success: false,
      providerId,
      ready: false,
      missing: secretValidation.missing
    };
  }

  return {
    success: true,
    providerId,
    ready: true,
    targetChatId: maskChatId(secrets.chatId)
  };
}

async function checkTelegramConnection(providerId = "telegram_bot_api", options = {}) {
  const secrets = getProviderSecrets(providerId);
  const validation = validateTelegramSecrets(secrets);

  if (!validation.success) {
    return {
      success: false,
      providerId,
      error: "Telegram credentials missing",
      missing: validation.missing
    };
  }

  if (options.safeMode !== false) {
    return {
      success: true,
      providerId,
      safeMode: true,
      ready: true,
      message: "Telegram connection check skipped in safe mode",
      targetChatId: maskChatId(secrets.chatId)
    };
  }

  const result = await getTelegramMe(secrets.botToken);

  return {
    success: result.success && result.body?.ok === true,
    providerId,
    safeMode: false,
    response: result.body,
    statusCode: result.statusCode
  };
}

async function publishTelegram(job, config = {}) {
  const providerId = config.providerId || "telegram_bot_api";
  const secrets = getProviderSecrets(providerId);

  const secretValidation = validateTelegramSecrets(secrets);

  if (!secretValidation.success) {
    return {
      success: false,
      realPublish: true,
      providerId,
      platform: "telegram",
      jobId: job.jobId,
      error: "Telegram credentials missing",
      missing: secretValidation.missing
    };
  }

  const jobValidation = validateTelegramJob(job);
  const text = normalizeText(job);

  if (!text) {
    return {
      success: false,
      realPublish: true,
      providerId,
      platform: "telegram",
      jobId: job.jobId,
      error: "Telegram message text is empty",
      validation: jobValidation
    };
  }

  const safeMode = config.safeMode !== false;

  if (safeMode) {
    return {
      success: true,
      realPublish: false,
      dryRun: true,
      safeMode: true,
      providerId,
      platform: "telegram",
      jobId: job.jobId,
      message: "Telegram publisher ready; safe mode active, no HTTP request sent",
      targetChatId: maskChatId(secrets.chatId),
      validation: jobValidation,
      publishedAt: new Date().toISOString()
    };
  }

  const response = await sendTelegramMessage({
    botToken: secrets.botToken,
    chatId: secrets.chatId,
    text
  });

  const ok = response.success && response.body?.ok === true;

  return {
    success: ok,
    realPublish: true,
    dryRun: false,
    safeMode: false,
    providerId,
    platform: "telegram",
    jobId: job.jobId,
    targetChatId: maskChatId(secrets.chatId),
    validation: jobValidation,
    response: response.body,
    statusCode: response.statusCode,
    error: ok ? null : response.error || response.body?.description || "Telegram publish failed",
    publishedAt: ok ? new Date().toISOString() : null
  };
}

module.exports = {
  publishTelegram,
  validateTelegramProvider,
  checkTelegramConnection
};
