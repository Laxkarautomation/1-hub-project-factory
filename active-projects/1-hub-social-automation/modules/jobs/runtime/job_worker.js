const {
  getNextPendingJob,
  completeJob,
  failJob,
  resetRunningJobs,
  queueSummary
} = require("../core/job_queue_manager");

const { runJobHandler } = require("./job_handlers");

async function runOneJob() {
  const job = getNextPendingJob();

  if (!job) {
    return {
      success: true,
      idle: true,
      message: "No pending jobs available",
      summary: queueSummary()
    };
  }

  try {
    const result = await runJobHandler(job);

    if (result && result.success === false) {
      throw new Error(result.error || "Job handler returned failure");
    }

    const completed = completeJob(job.id, result);

    return {
      success: true,
      idle: false,
      job: completed,
      result,
      summary: queueSummary()
    };
  } catch (error) {
    const failed = failJob(job.id, error);

    return {
      success: false,
      idle: false,
      job: failed,
      error: error.message,
      summary: queueSummary()
    };
  }
}

async function runWorkerBatch(limit = 5) {
  resetRunningJobs();

  const results = [];

  for (let index = 0; index < limit; index++) {
    const result = await runOneJob();
    results.push(result);

    if (result.idle) break;
  }

  return {
    success: results.every((item) => item.success || item.idle),
    phase: "12-job-worker-runtime",
    results,
    summary: queueSummary()
  };
}

module.exports = {
  runOneJob,
  runWorkerBatch
};
