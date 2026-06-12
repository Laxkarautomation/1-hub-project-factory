const { autoCreatePublishingQueue } = require("../scheduler/auto_schedule_generator");

const result = autoCreatePublishingQueue({
  channelId: "unraaz",
  providers: ["telegram", "youtube"],
  rules: { timeSlots: ["12:00", "18:00"] }
});

console.log(JSON.stringify({
  success: true,
  phase: "22.3-auto-schedule-generator",
  result
}, null, 2));
