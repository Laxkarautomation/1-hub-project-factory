const fs = require("fs");
const path = require("path");
const { selectActiveKey } = require("../../runtime/active_key_selector");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getImageData(data = {}) {
  if (data.result?.image) return data.result.image;
  if (data.result?.images?.[0]) return data.result.images[0];
  if (data.image) return data.image;
  return null;
}

async function run(payload = {}, credentials = {}) {
  const keySelection = selectActiveKey("cloudflare");

  const apiKey =
    credentials.apiKey ||
    credentials.value ||
    keySelection?.key?.value ||
    "";

  const accountId =
    credentials.accountId ||
    credentials.cloudflareAccountId ||
    keySelection?.key?.accountId ||
    keySelection?.key?.cloudflareAccountId ||
    "";

  const prompt = String(payload.prompt || payload.image_prompt || "").trim();
  const outputPath = payload.outputPath;

  if (!apiKey.trim()) {
    return {
      success: false,
      provider: "cloudflare",
      status: "provider_unavailable",
      error: "Cloudflare API key is not configured"
    };
  }

  if (!accountId.trim()) {
    return {
      success: false,
      provider: "cloudflare",
      status: "provider_unavailable",
      error: "Cloudflare account id is not configured"
    };
  }

  if (!prompt) {
    return {
      success: false,
      provider: "cloudflare",
      status: "invalid_payload",
      error: "Image prompt is required"
    };
  }

  if (!outputPath) {
    return {
      success: false,
      provider: "cloudflare",
      status: "invalid_payload",
      error: "outputPath is required"
    };
  }

  const model =
    credentials.modelName ||
    credentials.model ||
    "@cf/black-forest-labs/flux-1-schnell";

  const endpoint =
    credentials.endpoint ||
    "https://api.cloudflare.com/client/v4/accounts/" +
      accountId +
      "/ai/run/" +
      model;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        width: 720,
        height: 1280,
        num_steps: 4
      })
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      ensureDir(outputPath);
      fs.writeFileSync(outputPath, buffer);

      return {
        success: true,
        provider: "cloudflare",
        status: "generated",
        outputPath,
        model,
        bytes: buffer.length,
        contentType
      };
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      return {
        success: false,
        provider: "cloudflare",
        status: "api_error",
        error: json.errors?.[0]?.message || json.error || "Cloudflare image API failed",
        httpStatus: response.status,
        model,
        raw: json
      };
    }

    const imageData = getImageData(json);

    if (!imageData) {
      return {
        success: false,
        provider: "cloudflare",
        status: "no_image_data",
        error: "Cloudflare response did not include image data",
        model,
        raw: json
      };
    }

    const base64 = String(imageData).replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, buffer);

    return {
      success: true,
      provider: "cloudflare",
      status: "generated",
      outputPath,
      model,
      bytes: buffer.length
    };
  } catch (error) {
    return {
      success: false,
      provider: "cloudflare",
      status: "runtime_error",
      error: error.message,
      model
    };
  }
}

module.exports = {
  name: "cloudflare",
  run
};
