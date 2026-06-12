const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");

class XPublishingAdapter extends DryRunPublishingAdapter {
  validateJob(job) {
    const validation = super.validateJob(job);

    return {
      ...validation,
      platform: "x",
      requiredFields: ["title"],
      warnings: []
    };
  }
}

module.exports = XPublishingAdapter;
