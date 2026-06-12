const fs = require("fs");
const path = require("path");
const { requestJson } = require("../../utils/http_client");

function buildTelegramApiUrl(botToken, method) {
  return `https://api.telegram.org/bot${botToken}/${method}`;
}

function normalizeText(job = {}) {
  const title = job.payload?.title || "";
  const description = job.payload?.description || "";
  const link = job.payload?.url || job.payload?.link || "";

  return [title, description, link]
    .filter(Boolean)
    .join("\\n\\n")
    .trim();
}

function validateTelegramSecrets(secrets = {}) {
  const missing = [];

  if (!secrets.botToken) missing.push("botToken");
  if (!secrets.chatId) missing.push("chatId");

  return {
    success: missing.length === 0,
    missing
  };
}

function validateTelegramJob(job = {}) {
  const warnings = [];

  const text = normalizeText(job);
  const filePath = job.payload?.filePath || job.payload?.videoPath || job.payload?.imagePath || null;

  if (!text && !filePath) {
    warnings.push("No text or media path found");
  }

  if (filePath && !fs.existsSync(path.resolve(process.cwd(), filePath))) {
    warnings.push(`Media file does not exist: ${filePath}`);
  }

  return {
    success: warnings.length === 0,
    text,
    filePath,
    warnings
  };
}

async function sendTelegramMessage({ botToken, chatId, text, parseMode = null }) {
  const response = await requestJson(
    buildTelegramApiUrl(botToken, "sendMessage"),
    {
      method: "POST",
      body: {
        chat_id: chatId,
        text,
        ...(parseMode ? { parse_mode: parseMode } : {})
      }
    }
  );

  return response;
}

async function getTelegramMe(botToken) {
  return requestJson(
    buildTelegramApiUrl(botToken, "getMe"),
    {
      method: "GET"
    }
  );
}

module.exports = {
  buildTelegramApiUrl,
  normalizeText,
  validateTelegramSecrets,
  validateTelegramJob,
  sendTelegramMessage,
  getTelegramMe
};
