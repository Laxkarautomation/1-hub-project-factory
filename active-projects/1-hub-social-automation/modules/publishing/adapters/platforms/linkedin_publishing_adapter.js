const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");

class LinkedInPublishingAdapter extends DryRunPublishingAdapter {
  validateJob(job) {
    const validation = super.validateJob(job);

    return {
      ...validation,
      platform: "linkedin",
      requiredFields: ["title", "description"],
      warnings: []
    };
  }
}

module.exports = LinkedInPublishingAdapter;
