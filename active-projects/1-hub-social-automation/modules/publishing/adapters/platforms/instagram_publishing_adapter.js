const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");

class InstagramPublishingAdapter extends DryRunPublishingAdapter {
  validateJob(job) {
    const validation = super.validateJob(job);

    return {
      ...validation,
      platform: "instagram",
      requiredFields: ["title", "filePath"],
      warnings: job.payload?.filePath ? [] : ["payload.filePath missing for real publishing"]
    };
  }
}

module.exports = InstagramPublishingAdapter;
