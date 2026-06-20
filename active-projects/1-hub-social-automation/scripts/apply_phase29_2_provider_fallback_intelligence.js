const fs = require("fs");
const path = require("path");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

write("modules/image-factory/services/provider_fallback_intelligence.js", `function cleanText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\\w\\s\\u0900-\\u097F]/g, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function classifyProviderFailure(error = "") {
  const text = cleanText(error);

  if (!text) {
    return {
      type: "unknown",
      retryable: true,
      action: "fallback_to_next_provider"
    };
  }

  if (text.includes("quota") || text.includes("rate limit") || text.includes("429")) {
    return {
      type: "quota_exceeded",
      retryable: false,
      action: "skip_provider_use_fallback"
    };
  }

  if (text.includes("timeout") || text.includes("timed out") || text.includes("network")) {
    return {
      type: "timeout_or_network",
      retryable: true,
      action: "retry_once_then_fallback"
    };
  }

  if (text.includes("api key") || text.includes("unauthorized") || text.includes("401") || text.includes("403")) {
    return {
      type: "auth_or_key_error",
      retryable: false,
      action: "skip_provider_until_key_fixed"
    };
  }

  if (text.includes("safety") || text.includes("blocked") || text.includes("policy") || text.includes("nsfw")) {
    return {
      type: "safety_block",
      retryable: true,
      action: "sanitize_prompt_then_fallback"
    };
  }

  if (text.includes("empty") || text.includes("invalid response") || text.includes("no image")) {
    return {
      type: "empty_or_invalid_output",
      retryable: true,
      action: "retry_or_fallback"
    };
  }

  return {
    type: "provider_error",
    retryable: true,
    action: "fallback_to_next_provider"
  };
}

function buildFallbackChain(strategy = {}, failedProvider = "", failure = "") {
  const primary = strategy.primary_provider;
  const fallbackProviders = strategy.fallback_providers || [];
  const ranked = [
    primary,
    ...fallbackProviders
  ].filter(Boolean);

  const failureClass = classifyProviderFailure(failure);
  const failedIndex = ranked.indexOf(failedProvider);

  let nextProviders = failedIndex >= 0
    ? ranked.slice(failedIndex + 1)
    : ranked.filter(x => x !== failedProvider);

  if (failureClass.type === "safety_block") {
    nextProviders = nextProviders.filter(x => x !== failedProvider);
  }

  return {
    scene: strategy.scene,
    failed_provider: failedProvider || primary,
    failure_type: failureClass.type,
    retryable: failureClass.retryable,
    recommended_action: failureClass.action,
    next_provider: nextProviders[0] || null,
    fallback_chain: nextProviders,
    exhausted: nextProviders.length === 0
  };
}

function buildProviderFallbackReport({
  scriptId,
  strategyReport = {},
  simulatedFailures = []
}) {
  const strategies = strategyReport.strategies || [];

  const fallbacks = strategies.map(strategy => {
    const simulated = simulatedFailures.find(x => x.scene === strategy.scene) || {};
    const failedProvider = simulated.failed_provider || strategy.primary_provider;
    const failure = simulated.error || "quota exceeded simulated fallback audit";

    return buildFallbackChain(strategy, failedProvider, failure);
  });

  const exhausted = fallbacks.filter(x => x.exhausted).length;
  const retryable = fallbacks.filter(x => x.retryable).length;

  return {
    generated_at: new Date().toISOString(),
    script_id: scriptId,
    mode: simulatedFailures.length ? "failure_simulation" : "fallback_readiness_audit",
    summary: {
      total_scenes: fallbacks.length,
      fallback_ready: fallbacks.filter(x => x.next_provider).length,
      exhausted,
      retryable_failures: retryable,
      status: exhausted === 0 ? "provider_fallback_ready" : "provider_fallback_chain_exhausted"
    },
    fallbacks
  };
}

module.exports = {
  classifyProviderFailure,
  buildFallbackChain,
  buildProviderFallbackReport
};
`);

write("modules/image-factory/run_provider_fallback_audit.js", `const fs = require("fs");
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
`);
