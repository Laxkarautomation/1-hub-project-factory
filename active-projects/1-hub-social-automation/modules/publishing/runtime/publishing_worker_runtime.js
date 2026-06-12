const {
  runPublishingWorkerBatch
} = require("../workers/publishing_worker");

const {
  getSettings
} = require("../../admin-platform/settings/settings_service");

const {
  getRuntimeState
} = require("../../admin-platform/services/admin_runtime_service");

let timer = null;

async function workerTick() {
  try {
    const runtime = getRuntimeState()?.runtime || {};

    if (runtime.paused) {
      console.log("[publishing-worker] runtime paused");
      return;
    }

    const result = await runPublishingWorkerBatch({
      limit: 3,
      dryRun: true
    });

    console.log("[publishing-worker] tick", JSON.stringify({
      success: result.success,
      completed: result.completed,
      failed: result.failed,
      idle: result.idle
    }));
  } catch (error) {
    console.error("[publishing-worker] error", error.message);
  }
}

function startPublishingWorkerRuntime() {
  const settings = getSettings();
  const publishing = settings.publishing || {};
  const scheduler = settings.scheduler || {};

  if (publishing.enabled === false) {
    console.log("[publishing-worker] disabled");
    return {
      success: false,
      disabled: true
    };
  }

  const intervalSeconds =
    publishing.workerIntervalSeconds ||
    scheduler.pollIntervalSeconds ||
    30;

  if (timer) clearInterval(timer);

  timer = setInterval(workerTick, intervalSeconds * 1000);

  console.log(`[publishing-worker] started (${intervalSeconds}s)`);
  workerTick();

  return {
    success: true,
    intervalSeconds
  };
}

function stopPublishingWorkerRuntime() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log("[publishing-worker] stopped");

  return {
    success: true
  };
}

module.exports = {
  startPublishingWorkerRuntime,
  stopPublishingWorkerRuntime
};
