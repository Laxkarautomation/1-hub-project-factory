class BasePublishingAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  validateJob(job) {
    if (!job.platform) throw new Error("job.platform is required");
    if (!job.contentType) throw new Error("job.contentType is required");
    if (!job.payload) throw new Error("job.payload is required");

    return {
      success: true,
      platform: job.platform,
      contentType: job.contentType
    };
  }

  async publish(job) {
    this.validateJob(job);

    return {
      success: false,
      dryRun: true,
      message: "Base adapter does not publish directly",
      jobId: job.jobId
    };
  }
}

module.exports = BasePublishingAdapter;
