function rankCompetitors(videos = []) {
  const map = {};

  for (const video of videos) {
    const source = video.source_name || "unknown";

    if (!map[source]) {
      map[source] = {
        source_name: source,
        total_videos: 0,
        total_score: 0
      };
    }

    map[source].total_videos += 1;
    map[source].total_score += Number(
      video.quality_score || video.trend_score || 0
    );
  }

  return Object.values(map)
    .map(item => ({
      ...item,
      average_score:
        item.total_score / Math.max(item.total_videos, 1)
    }))
    .sort((a,b) => b.average_score - a.average_score)
    .slice(0,20);
}

module.exports = { rankCompetitors };
