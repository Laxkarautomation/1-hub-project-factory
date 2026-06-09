const { selectActiveKey } = require("../../runtime/active_key_selector");

const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-5.1-mini";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";

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

function extractOpenAIText(responseJson = {}) {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text.trim();
  }

  const output = Array.isArray(responseJson.output) ? responseJson.output : [];

  return output
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(content => content.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("openai");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "openai",
      status: "provider_unavailable",
      error: "OpenAI API key is not configured",
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
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: prompt
      })
    });

    const responseJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        provider: "openai",
        status: "provider_error",
        error: responseJson?.error?.message || `OpenAI API failed with HTTP ${response.status}`,
        httpStatus: response.status,
        model
      };
    }

    const text = extractOpenAIText(responseJson);

    if (!text) {
      return {
        success: false,
        provider: "openai",
        status: "empty_response",
        error: "OpenAI returned no text output",
        model,
        raw: responseJson
      };
    }

    return {
      success: true,
      provider: "openai",
      status: "completed",
      model,
      text,
      raw: responseJson
    };
  } catch (error) {
    return {
      success: false,
      provider: "openai",
      status: "provider_exception",
      error: error.message,
      model
    };
  }
}

module.exports = {
  name: "openai",
  run
};
