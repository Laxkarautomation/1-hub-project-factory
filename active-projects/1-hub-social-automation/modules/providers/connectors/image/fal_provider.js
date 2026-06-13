const fs = require("fs");

function getApiKey(credentials = {}) {
  return credentials.apiKey || credentials.value || credentials.key || "";
}

function getModel(credentials = {}) {
  return credentials.modelName || credentials.model || "fal-ai/flux/schnell";
}

function getEndpoint(credentials = {}) {
  return credentials.endpoint || "https://fal.run/";
}

async function run(payload = {}, credentials = {}) {
  const apiKey = getApiKey(credentials);

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      provider: "fal",
      status: "provider_unavailable",
      error: "Fal API key is not configured"
    };
  }

  const prompt = payload.prompt || payload.image_prompt || "";
  const outputPath = payload.outputPath;

  if (!prompt.trim()) {
    return {
      success: false,
      provider: "fal",
      status: "invalid_payload",
      error: "Image prompt is required"
    };
  }

  if (!outputPath) {
    return {
      success: false,
      provider: "fal",
      status: "invalid_payload",
      error: "outputPath is required"
    };
  }

  const endpoint = getEndpoint(credentials).replace(/\/$/, "") + "/" + getModel(credentials);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Key " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        image_size: "portrait_16_9",
        num_images: 1
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        provider: "fal",
        status: "api_error",
        error: data.detail || data.error || "Fal image API failed",
        httpStatus: response.status,
        data
      };
    }

    const imageUrl =
      data?.images?.[0]?.url ||
      data?.image?.url ||
      data?.url;

    if (!imageUrl) {
      return {
        success: false,
        provider: "fal",
        status: "no_image_url",
        error: "Fal response did not include image url",
        data
      };
    }

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return {
        success: false,
        provider: "fal",
        status: "download_failed",
        error: "Generated image download failed",
        httpStatus: imageResponse.status
      };
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    return {
      success: true,
      provider: "fal",
      status: "generated",
      outputPath,
      model: getModel(credentials)
    };
  } catch (error) {
    return {
      success: false,
      provider: "fal",
      status: "runtime_error",
      error: error.message
    };
  }
}

module.exports = {
  name: "fal",
  run
};
