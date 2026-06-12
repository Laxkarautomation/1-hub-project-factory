const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");
const { publishTelegram } = require("../../providers/telegram/telegram_real_publisher");

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

  async publish(job) {
    if (this.config.realPublishing === true) {
      return publishTelegram(job, this.config);
    }

    return super.publish(job);
  }
}

module.exports = TelegramPublishingAdapter;
