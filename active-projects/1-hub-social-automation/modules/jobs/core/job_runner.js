const { execSync } = require("child_process");

function runCommandJob(job) {
  if (!job || !job.id || !job.command) {
    throw new Error("Invalid command job. Required: id, command");
  }

  console.log(`\n▶ Job: ${job.name || job.id}`);
  console.log(`$ ${job.command}`);

  const startedAt = new Date().toISOString();
  const started = Date.now();

  try {
    execSync(job.command, { stdio: "inherit" });

    return {
      id: job.id,
      name: job.name || job.id,
      type: job.type || "command",
      command: job.command,
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started
    };
  } catch (error) {
    return {
      id: job.id,
      name: job.name || job.id,
      type: job.type || "command",
      command: job.command,
      status: "failed",
      error: error.message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started
    };
  }
}

module.exports = {
  runCommandJob
};
