const {
  startSchedulerRuntime,
  stopSchedulerRuntime
} = require("./runtime/publishing_scheduler_runtime");

startSchedulerRuntime();

process.on("SIGINT", () => {

  stopSchedulerRuntime();

  process.exit(0);
});

process.on("SIGTERM", () => {

  stopSchedulerRuntime();

  process.exit(0);
});
