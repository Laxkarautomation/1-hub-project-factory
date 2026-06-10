const { runAdminRuntimePreflight } = require("./admin_runtime_preflight");

function main() {
  const result = runAdminRuntimePreflight();

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    phase: "11-admin-runtime-pipeline-preflight",
    error: error.message
  }, null, 2));

  process.exitCode = 1;
}
