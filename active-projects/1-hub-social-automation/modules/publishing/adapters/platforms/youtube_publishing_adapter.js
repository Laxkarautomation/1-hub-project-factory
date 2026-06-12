const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");

class YouTubePublishingAdapter extends DryRunPublishingAdapter {
  validateJob(job) {
    const validation = super.validateJob(job);

    return {
      ...validation,
      platform: "youtube",
      requiredFields: ["title"],
      warnings: job.payload?.title ? [] : ["payload.title missing"]
    };
  }
}

module.exports = YouTubePublishingAdapter;
