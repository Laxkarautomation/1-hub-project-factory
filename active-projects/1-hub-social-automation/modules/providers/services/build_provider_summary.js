const fs = require("fs");
const path = require("path");

function buildProviderSummary() {
  const healthPath = path.join(
    process.cwd(),
    "modules/providers/output/provider_health_status.json"
  );

  if (!fs.existsSync(healthPath)) {
    throw new Error("Provider health status not found. Run run_provider_health_check.js first.");
  }

  const health = JSON.parse(fs.readFileSync(healthPath, "utf8"));
  const status = health.status || {};

  const summary = Object.entries(status).map(([type, result]) => ({
    type,
    healthy: !!result.success,
    active_provider: result.provider,
    state: result.success ? "healthy" : "needs_provider_key_or_setup",
    attempts: (result.attempts || []).map(a => ({
      provider: a.provider,
      success: a.success,
      error: a.error
    }))
  }));

  return {
    generated_at: new Date().toISOString(),
    summary
  };
}

module.exports = { buildProviderSummary };
