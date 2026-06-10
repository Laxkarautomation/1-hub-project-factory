const {
  calculateProviderHealth
} = require("./health/provider_health_monitor");

console.log(
  JSON.stringify(
    calculateProviderHealth("gemini"),
    null,
    2
  )
);
