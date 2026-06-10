const { schedulePhase12TestJobs } = require("./scheduler/job_scheduler");

function main() {
  const channelId = process.argv[2] || "unraaz";
  const result = schedulePhase12TestJobs(channelId);
  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));

  process.exitCode = 1;
}
