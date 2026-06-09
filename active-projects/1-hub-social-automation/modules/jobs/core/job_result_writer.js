const fs = require("fs");
const path = require("path");

const outputDir = path.join(process.cwd(), "modules/jobs/output");
const outputPath = path.join(outputDir, "job_results.json");

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

function readJobResults() {
  ensureOutputDir();

  if (!fs.existsSync(outputPath)) {
    return {
      generated_at: null,
      results: []
    };
  }

  return JSON.parse(fs.readFileSync(outputPath, "utf-8"));
}

function writeJobResult(result) {
  ensureOutputDir();

  const data = readJobResults();

  data.generated_at = new Date().toISOString();
  data.results.push({
    ...result,
    recorded_at: new Date().toISOString()
  });

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  return outputPath;
}

module.exports = {
  outputPath,
  readJobResults,
  writeJobResult
};
