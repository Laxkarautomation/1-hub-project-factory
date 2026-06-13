const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on("error", (error) => {
      resolve({ code: -1, stdout, stderr: error.message });
    });
  });
}

async function run(payload = {}, credentials = {}) {
  const text = String(payload.text || payload.scriptText || payload.narration || "").trim();
  const outputPath = payload.outputPath || payload.outputAudio || payload.audioPath;

  if (!text) {
    return {
      success: false,
      provider: "edge_tts",
      status: "invalid_payload",
      error: "Text is required for Edge-TTS"
    };
  }

  if (!outputPath) {
    return {
      success: false,
      provider: "edge_tts",
      status: "invalid_payload",
      error: "outputPath is required for Edge-TTS"
    };
  }

  ensureDir(outputPath);

  const voice =
    credentials.voice ||
    credentials.modelName ||
    payload.voice ||
    "en-US-EmmaMultilingualNeural";

  const rate = credentials.rate || payload.rate || "+0%";
  const pitch = credentials.pitch || payload.pitch || "+0Hz";
  const volume = credentials.volume || payload.volume || "+0%";

  const textFile = outputPath + ".txt";
  fs.writeFileSync(textFile, text);

  const args = [
    "-m",
    "edge_tts",
    "--file",
    textFile,
    "--voice",
    voice,
    "--rate",
    rate,
    "--pitch",
    pitch,
    "--volume",
    volume,
    "--write-media",
    outputPath
  ];

  const result = await runCommand("python3", args);

  if (result.code !== 0) {
    return {
      success: false,
      provider: "edge_tts",
      status: "tts_failed",
      error: result.stderr || result.stdout || "Edge-TTS failed",
      exitCode: result.code
    };
  }

  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
    return {
      success: false,
      provider: "edge_tts",
      status: "missing_output",
      error: "Edge-TTS completed but audio file was not created",
      outputPath
    };
  }

  return {
    success: true,
    provider: "edge_tts",
    status: "generated",
    outputPath,
    voice,
    bytes: fs.statSync(outputPath).size
  };
}

module.exports = {
  name: "edge_tts",
  run
};
