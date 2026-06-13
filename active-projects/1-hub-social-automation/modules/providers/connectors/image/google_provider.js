const fs = require("fs");
const path = require("path");
const { selectActiveKey } = require("../../runtime/active_key_selector");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function extractImagePart(responseJson = {}) {
  const parts = responseJson?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      return {
        data: inlineData.data,
        mimeType: inlineData.mimeType || inlineData.mime_type || "image/png"
      };
    }
  }

  return null;
}

function extensionFromMime(mimeType = "") {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  if (mimeType.includes("webp")) return ".webp";
  return ".png";
}

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("google");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "google",
      status: "provider_unavailable",
      error: "Google image API key is not configured",
      keyStatus: keySelection.status || "no_key"
    };
  }

  const prompt = String(payload.prompt || payload.image_prompt || "").trim();
  let outputPath = payload.outputPath;

  if (!prompt) {
    return {
      success: false,
      provider: "google",
      status: "invalid_payload",
      error: "Image prompt is required"
    };
  }

  if (!outputPath) {
    return {
      success: false,
      provider: "google",
      status: "invalid_payload",
      error: "outputPath is required"
    };
  }

  const model =
    credentials.modelName ||
    credentials.model ||
    payload.model ||
    "gemini-3.1-flash-image-preview";

  const endpointBase =
    credentials.endpoint ||
    "https://generativelanguage.googleapis.com/v1beta";

  const endpoint =
    endpointBase.replace(/\/$/, "") +
    "/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  try {
    const response = await fetch(endpoint, {
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
        ],
        generationConfig: {
          responseModalities: ["IMAGE"]
        }
      })
    });

    const responseJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        provider: "google",
        status: "api_error",
        error: responseJson?.error?.message || "Google image API failed",
        httpStatus: response.status,
        model,
        raw: responseJson
      };
    }

    const imagePart = extractImagePart(responseJson);

    if (!imagePart?.data) {
      return {
        success: false,
        provider: "google",
        status: "no_image_data",
        error: "Google image response did not include inline image data",
        model,
        raw: responseJson
      };
    }

    const preferredExt = extensionFromMime(imagePart.mimeType);
    outputPath = outputPath.replace(/\.(jpg|jpeg|png|webp)$/i, preferredExt);

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, Buffer.from(imagePart.data, "base64"));

    return {
      success: true,
      provider: "google",
      status: "generated",
      outputPath,
      model,
      mimeType: imagePart.mimeType,
      bytes: fs.statSync(outputPath).size
    };
  } catch (error) {
    return {
      success: false,
      provider: "google",
      status: "runtime_error",
      error: error.message,
      model
    };
  }
}

module.exports = {
  name: "google",
  run
};
