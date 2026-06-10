const { resolveRuntimeConfig } = require("./runtime/runtime_config_resolver");

function main() {
  const result = resolveRuntimeConfig();
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exitCode = 1;
  }
}

main();
