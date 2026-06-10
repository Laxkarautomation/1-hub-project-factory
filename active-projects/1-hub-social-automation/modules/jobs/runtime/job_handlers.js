const { runWithAdminAwareProviders } = require("../../providers/runtime/admin_aware_provider_runner");
const { mockHandlers } = require("../../providers/runtime/mock_provider_handlers");

async function handleSystemTest(job) {
  return {
    success: true,
    message: "System test job completed",
    jobId: job.id,
    payload: job.payload
  };
}

async function handleProviderAwareJob(job) {
  if (!job.providerService) {
    return {
      success: true,
      message: "No provider service required",
      jobId: job.id,
      payload: job.payload
    };
  }

  return runWithAdminAwareProviders(
    job.providerService,
    mockHandlers,
    {
      jobId: job.id,
      jobType: job.type,
      channelId: job.channelId,
      payload: job.payload
    }
  );
}

async function runJobHandler(job) {
  if (job.type === "system_test") {
    return handleSystemTest(job);
  }

  return handleProviderAwareJob(job);
}

module.exports = {
  runJobHandler
};
