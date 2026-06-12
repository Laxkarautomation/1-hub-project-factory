const { runPublishingScheduler } = require("./scheduler/publishing_scheduler");

runPublishingScheduler({
  dryRun: process.argv.includes("--real") ? false : true
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }, null, 2));
    process.exit(1);
  });
