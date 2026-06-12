const publishingService = require("./services/publishing_service");

async function main() {
  const before = publishingService.getPublishingDashboard();

  const enqueued = publishingService.enqueuePublishingJob({
    jobId: "publish_service_test_job",
    channelId: "test-channel",
    platform: "youtube",
    contentType: "video",
    priority: 1,
    payload: {
      title: "Publishing service test",
      filePath: "storage/videos/test.mp4"
    }
  });

  const runResult = await publishingService.runNextPublishingJob();
  const after = publishingService.getPublishingDashboard();

  console.log(JSON.stringify({
    success: true,
    phase: "15.3-publishing-service",
    platforms: before.platforms.length,
    enqueued: !!enqueued.job,
    runSuccess: runResult.success,
    queueAfter: after.queue.length,
    historyCount: after.history.length
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));
  process.exit(1);
});
