const PENALTY_RULES = [
  { label: "trailer", points: 8, pattern: /\btrailer\b/i },
  { label: "season", points: 5, pattern: /\bseason\b/i },
  { label: "episode", points: 3, pattern: /\bepisode\b/i },
  { label: "podcast", points: 7, pattern: /\bpodcast\b/i },
  { label: "compilation", points: 6, pattern: /\bcompilation\b/i },
  { label: "bloopers", points: 8, pattern: /\bbloopers?\b/i },
  { label: "outtakes", points: 8, pattern: /\bouttakes?\b/i },
  { label: "volume_repeat", points: 3, pattern: /\bvol\.?\s*\d+/i }
];

const BOOST_RULES = [
  { label: "story", points: 3, pattern: /\bstory\b/i },
  { label: "case", points: 3, pattern: /\bcase\b/i },
  { label: "documentary", points: 2, pattern: /\bdocumentary\b/i },
  { label: "hindi", points: 2, pattern: /\bhindi\b|[\u0900-\u097F]/i },
  { label: "real_incident", points: 3, pattern: /\breal\b|\btrue\b|सच्ची|कहानी/i }
];

function calculateQuality(video) {
  const title = video.title || "";
  let penalty = 0;
  let boost = 0;
  const penalty_reasons = [];
  const boost_reasons = [];

  for (const rule of PENALTY_RULES) {
    if (rule.pattern.test(title)) {
      penalty += rule.points;
      penalty_reasons.push(rule.label);
    }
  }

  for (const rule of BOOST_RULES) {
    if (rule.pattern.test(title)) {
      boost += rule.points;
      boost_reasons.push(rule.label);
    }
  }

  const baseTrendScore = Number(video.trend_score || 0);
  const quality_score = Math.max(0, baseTrendScore + boost - penalty);

  return {
    ...video,
    quality_score,
    quality_boost: boost,
    quality_penalty: penalty,
    penalty_reasons,
    boost_reasons
  };
}

module.exports = {
  calculateQuality
};
