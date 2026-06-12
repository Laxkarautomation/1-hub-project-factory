const {
  startPublishingWorkerRuntime,
  stopPublishingWorkerRuntime
} = require("./runtime/publishing_worker_runtime");

startPublishingWorkerRuntime();

process.on("SIGINT", () => {
  stopPublishingWorkerRuntime();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopPublishingWorkerRuntime();
  process.exit(0);
});
