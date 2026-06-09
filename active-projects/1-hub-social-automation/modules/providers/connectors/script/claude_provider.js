const { selectActiveKey } = require("../../runtime/active_key_selector");

const DEFAULT_MODEL = process.env.CLAUDE_DEFAULT_MODEL || "claude-sonnet-4-5";
const DEFAULT_ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

function extractPrompt(payload = {}) {
  return (
    payload.prompt ||
    payload.brief ||
    payload.scriptBrief ||
    payload.text ||
    payload.input ||
    JSON.stringify(payload)
  );
}

function extractClaudeText(responseJson = {}) {
  const content = Array.isArray(responseJson.content) ? responseJson.content : [];

  return content
    .map(item => item.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("claude");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "claude",
      status: "provider_unavailable",
      error: "Claude API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  const model = credentials.model || payload.model || DEFAULT_MODEL;
  const prompt = extractPrompt(payload);

  try {
    const response = await fetch(DEFAULT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": credentials.anthropicVersion || DEFAULT_ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model,
        max_tokens: payload.maxTokens || credentials.maxTokens || 1000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const responseJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        provider: "claude",
        status: "provider_error",
        error: responseJson?.error?.message || `Claude API failed with HTTP ${response.status}`,
        httpStatus: response.status,
        model
      };
    }

    const text = extractClaudeText(responseJson);

    if (!text) {
      return {
        success: false,
        provider: "claude",
        status: "empty_response",
        error: "Claude returned no text output",
        model,
        raw: responseJson
      };
    }

    return {
      success: true,
      provider: "claude",
      status: "completed",
      model,
      text,
      raw: responseJson
    };
  } catch (error) {
    return {
      success: false,
      provider: "claude",
      status: "provider_exception",
      error: error.message,
      model
    };
  }
}

module.exports = {
  name: "claude",
  run
};
