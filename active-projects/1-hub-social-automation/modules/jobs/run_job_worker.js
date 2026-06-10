const { runWorkerBatch } = require("./runtime/job_worker");

async function main() {
  const limit = Number(process.argv[2] || 5);
  const result = await runWorkerBatch(limit);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));

  process.exitCode = 1;
});
