const { dispatchJob } = require("./core/job_dispatcher");
const { outputPath } = require("./core/job_result_writer");

async function main() {
  const jobs = [
    {
      id: "job_layer_echo_test",
      name: "Job Layer Echo Test",
      type: "command",
      command: "node -e \"console.log('job layer ok')\""
    },
    {
      id: "job_layer_dry_run_test",
      name: "Job Layer Dry Run Test",
      type: "command",
      command: "node -e \"console.log('dry run should not execute')\""
    }
  ];

  const realResult = await dispatchJob(jobs[0]);
  const dryResult = await dispatchJob(jobs[1], { dryRun: true });

  if (realResult.status !== "success") {
    throw new Error("Real job test failed");
  }

  if (dryResult.status !== "dry_run") {
    throw new Error("Dry run job test failed");
  }

  console.log("\n✅ Job layer preflight complete");
  console.log(`Report: ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
