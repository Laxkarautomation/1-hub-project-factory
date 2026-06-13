const fs = require("fs");
const path = require("path");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function run(payload = {}, credentials = {}) {
  const prompt = String(payload.prompt || payload.image_prompt || "").trim();
  const outputPath = payload.outputPath;

  if (!prompt) {
    return {
      success: false,
      provider: "pollinations",
      status: "invalid_payload",
      error: "Image prompt is required"
    };
  }

  if (!outputPath) {
    return {
      success: false,
      provider: "pollinations",
      status: "invalid_payload",
      error: "outputPath is required"
    };
  }

  const endpoint = credentials.endpoint || "https://image.pollinations.ai/prompt";
  const model = credentials.modelName || credentials.model || "flux";

  const url =
    endpoint.replace(/\/$/, "") +
    "/" +
    encodeURIComponent(prompt) +
    "?width=720&height=1280&model=" +
    encodeURIComponent(model) +
    "&nologo=true&private=true&safe=true";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        provider: "pollinations",
        status: "api_error",
        error: "Pollinations image API failed",
        httpStatus: response.status
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length < 1000) {
      return {
        success: false,
        provider: "pollinations",
        status: "empty_image",
        error: "Pollinations returned too small image response",
        bytes: buffer.length
      };
    }

    ensureDir(outputPath);
    fs.writeFileSync(outputPath, buffer);

    return {
      success: true,
      provider: "pollinations",
      status: "generated",
      outputPath,
      model,
      bytes: buffer.length
    };
  } catch (error) {
    return {
      success: false,
      provider: "pollinations",
      status: "runtime_error",
      error: error.message
    };
  }
}

module.exports = {
  name: "pollinations",
  run
};
