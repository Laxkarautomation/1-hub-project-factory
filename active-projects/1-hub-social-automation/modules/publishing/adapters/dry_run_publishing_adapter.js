const BasePublishingAdapter = require("./base_publishing_adapter");

class DryRunPublishingAdapter extends BasePublishingAdapter {
  async publish(job) {
    const validation = this.validateJob(job);

    return {
      success: true,
      dryRun: true,
      providerId: this.config.providerId || "dry_run",
      platform: job.platform,
      jobId: job.jobId,
      validation,
      simulatedUrl: `https://example.com/${job.platform}/${job.jobId}`,
      publishedAt: new Date().toISOString()
    };
  }
}

module.exports = DryRunPublishingAdapter;
