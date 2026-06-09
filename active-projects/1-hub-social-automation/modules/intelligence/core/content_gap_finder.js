const GAP_TOPICS = [
  "indian village mystery",
  "real money lesson",
  "small town crime",
  "business scam story",
  "missing person case",
  "historical mystery india",
  "loan fraud story",
  "family betrayal story"
];

function normalize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
}

function findContentGaps(videos = []) {
  const corpus = normalize(videos.map(video => video.title || "").join(" "));

  return GAP_TOPICS
    .map(topic => {
      const words = topic.split(" ");
      const matched_words = words.filter(word => corpus.includes(word));
      const coverage = matched_words.length / words.length;

      return {
        topic,
        coverage: Number(coverage.toFixed(2)),
        opportunity_score: Number((1 - coverage).toFixed(2)),
        matched_words
      };
    })
    .sort((a, b) => b.opportunity_score - a.opportunity_score);
}

module.exports = { findContentGaps };
