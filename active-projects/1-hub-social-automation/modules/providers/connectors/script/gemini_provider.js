const { selectActiveKey } = require("../../runtime/active_key_selector");

const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || "gemini-3.1-flash-lite";
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

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

function extractGeminiText(responseJson = {}) {
  const parts = responseJson?.candidates?.[0]?.content?.parts || [];
  return parts
    .map(part => part.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("gemini");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "gemini",
      status: "provider_unavailable",
      error: "Gemini API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  const model = credentials.model || payload.model || DEFAULT_MODEL;
  const prompt = extractPrompt(payload);

  try {
    const response = await fetch(
      `${DEFAULT_ENDPOINT}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const responseJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        provider: "gemini",
        status: "provider_error",
        error: responseJson?.error?.message || `Gemini API failed with HTTP ${response.status}`,
        httpStatus: response.status,
        model
      };
    }

    const text = extractGeminiText(responseJson);

    if (!text) {
      return {
        success: false,
        provider: "gemini",
        status: "empty_response",
        error: "Gemini returned no text output",
        model,
        raw: responseJson
      };
    }

    return {
      success: true,
      provider: "gemini",
      status: "completed",
      model,
      text,
      raw: responseJson
    };
  } catch (error) {
    return {
      success: false,
      provider: "gemini",
      status: "provider_exception",
      error: error.message,
      model
    };
  }
}

module.exports = {
  name: "gemini",
  run
};
