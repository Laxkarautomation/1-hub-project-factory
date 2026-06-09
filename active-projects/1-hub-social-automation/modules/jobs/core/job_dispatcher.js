const { runCommandJob } = require("./job_runner");
const { writeJobResult } = require("./job_result_writer");

async function dispatchJob(job, options = {}) {
  const dryRun = !!options.dryRun;

  if (!job || !job.id) {
    throw new Error("Invalid job. Required: id");
  }

  if (dryRun) {
    const result = {
      id: job.id,
      name: job.name || job.id,
      type: job.type || "command",
      command: job.command || null,
      status: "dry_run",
      dryRun: true,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: 0
    };

    if (options.writeResult !== false) {
      writeJobResult(result);
    }

    return result;
  }

  const result = runCommandJob(job);

  if (options.writeResult !== false) {
    writeJobResult(result);
  }

  if (result.status === "failed" && options.throwOnFailure !== false) {
    const error = new Error(`Job failed: ${job.id}`);
    error.result = result;
    throw error;
  }

  return result;
}

module.exports = {
  dispatchJob
};
