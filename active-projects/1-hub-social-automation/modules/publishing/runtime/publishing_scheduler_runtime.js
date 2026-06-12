const {
  runPublishingScheduler
} = require("../scheduler/publishing_scheduler");

const {
  getSettings
} = require("../../admin-platform/settings/settings_service");

const {
  getRuntimeState
} = require("../../admin-platform/services/admin_runtime_service");

let timer = null;

async function schedulerTick() {
  try {

    const runtime =
      getRuntimeState()?.runtime || {};

    if (runtime.paused) {
      console.log("[scheduler] runtime paused");
      return;
    }

    const result =
      await runPublishingScheduler({
        dryRun: true
      });

    console.log(
      "[scheduler] tick",
      JSON.stringify({
        success: result.success,
        dueCount: result.dueCount,
        enqueuedCount: result.enqueuedCount
      })
    );

  } catch (error) {

    console.error(
      "[scheduler] error",
      error.message
    );
  }
}

function startSchedulerRuntime() {

  const settings =
    getSettings();

  const scheduler =
    settings.scheduler || {};

  if (scheduler.enabled === false) {

    console.log(
      "[scheduler] disabled"
    );

    return {
      success: false,
      disabled: true
    };
  }

  const intervalSeconds =
    scheduler.pollIntervalSeconds || 30;

  if (timer) {
    clearInterval(timer);
  }

  timer = setInterval(
    schedulerTick,
    intervalSeconds * 1000
  );

  console.log(
    `[scheduler] started (${intervalSeconds}s)`
  );

  schedulerTick();

  return {
    success: true,
    intervalSeconds
  };
}

function stopSchedulerRuntime() {

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log(
    "[scheduler] stopped"
  );

  return {
    success: true
  };
}

module.exports = {
  startSchedulerRuntime,
  stopSchedulerRuntime
};
