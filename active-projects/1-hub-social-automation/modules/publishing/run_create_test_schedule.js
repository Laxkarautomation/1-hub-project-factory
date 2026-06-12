const { upsertSchedule } = require("./scheduler/schedule_store");

const schedule = upsertSchedule({
  channelId: "unraaz",
  providerId: null,
  contentId: "test_content_001",
  publishAt: new Date(Date.now() - 60 * 1000).toISOString(),
  payload: {
    title: "Test scheduled publish",
    description: "Dry-run scheduled publishing test"
  }
});

console.log(JSON.stringify({
  success: true,
  schedule
}, null, 2));
