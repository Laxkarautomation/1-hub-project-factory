const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");

class TelegramPublishingAdapter extends DryRunPublishingAdapter {
  validateJob(job) {
    const validation = super.validateJob(job);

    return {
      ...validation,
      platform: "telegram",
      requiredFields: ["title"],
      warnings: []
    };
  }
}

module.exports = TelegramPublishingAdapter;
