const DryRunPublishingAdapter = require("../dry_run_publishing_adapter");
const { publishYouTube } = require("../../providers/youtube/youtube_real_publisher");

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

  async publish(job) {
    if (this.config.realPublishing === true) {
      return publishYouTube(job, this.config);
    }

    return super.publish(job);
  }
}

module.exports = YouTubePublishingAdapter;
