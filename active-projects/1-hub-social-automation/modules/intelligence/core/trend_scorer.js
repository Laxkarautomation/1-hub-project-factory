const HIGH_SIGNAL_WORDS = [
  "unsolved", "mystery", "mysterious", "secret", "hidden",
  "dark", "real", "true", "missing", "crime", "death",
  "terrifying", "strange", "unknown", "dangerous", "horror"
];

function scoreVideo(video) {
  const title = (video.title || "").toLowerCase();
  let titleScore = 0;
  const trend_signals = [];

  for (const word of HIGH_SIGNAL_WORDS) {
    if (title.includes(word)) {
      titleScore += 3;
      trend_signals.push(word);
    }
  }

  const duration = Number(video.duration_seconds || 0);
  const durationScore = duration <= 60 ? 4 : duration <= 900 ? 3 : 1;
  const relevanceScore = Number(video.relevance_score || 0);

  return {
    ...video,
    trend_score: relevanceScore + titleScore + durationScore,
    trend_signals: [...new Set(trend_signals)]
  };
}

module.exports = { scoreVideo };
