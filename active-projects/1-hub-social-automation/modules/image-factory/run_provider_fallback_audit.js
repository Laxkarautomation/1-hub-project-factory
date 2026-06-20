const fs = require("fs");
const path = require("path");
const {
  buildProviderFallbackReport
} = require("./services/provider_fallback_intelligence");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const scriptId = process.argv[2];

if (!scriptId) {
  console.error("Usage: node modules/image-factory/run_provider_fallback_audit.js research_script_001");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "modules/image-factory/output");
const strategyPath = path.join(outputDir, scriptId + "_image_strategy_report.json");

const strategyReport = readJson(strategyPath, null);

if (!strategyReport) {
  console.error("Missing image strategy report. Run:");
  console.error("node modules/image-factory/run_image_strategy_resolver.js " + scriptId);
  process.exit(1);
}

const simulatedFailures = [
  {
    scene: 1,
    failed_provider: "google",
    error: "quota exceeded"
  },
  {
    scene: 2,
    failed_provider: "google",
    error: "timeout"
  },
  {
    scene: 3,
    failed_provider: "google",
    error: "safety blocked"
  },
  {
    scene: 4,
    failed_provider: "google",
    error: "401 api key unauthorized"
  },
  {
    scene: 5,
    failed_provider: "google",
    error: "invalid response no image"
  }
];

const report = buildProviderFallbackReport({
  scriptId,
  strategyReport,
  simulatedFailures
});

const outputPath = path.join(
  outputDir,
  scriptId + "_provider_fallback_report.json"
);

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log("Provider fallback report saved: " + outputPath);
console.table(report.fallbacks.map(x => ({
  scene: x.scene,
  failed: x.failed_provider,
  type: x.failure_type,
  action: x.recommended_action,
  next: x.next_provider,
  exhausted: x.exhausted
})));
console.log("Summary:", report.summary);
