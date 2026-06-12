const {
  runPublishingWorkerOnce,
  runPublishingWorkerBatch,
  getWorkerDashboard
} = require("./workers/publishing_worker");

async function main() {
  if (process.argv.includes("--dashboard")) {
    console.log(JSON.stringify(getWorkerDashboard(), null, 2));
    return;
  }

  if (process.argv.includes("--batch")) {
    const result = await runPublishingWorkerBatch({
      limit: Number(process.argv[3] || 5),
      dryRun: !process.argv.includes("--real")
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
    return;
  }

  const result = await runPublishingWorkerOnce({
    dryRun: !process.argv.includes("--real")
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message,
    stack: error.stack
  }, null, 2));
  process.exit(1);
});
