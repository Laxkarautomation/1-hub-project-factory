const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");

class FacebookPublishingAdapter extends DryRunPublishingAdapter {
  validateJob(job) {
    const validation = super.validateJob(job);

    return {
      ...validation,
      platform: "facebook",
      requiredFields: ["title"],
      warnings: []
    };
  }
}

module.exports = FacebookPublishingAdapter;
