const PATTERNS = [
  { name: "true_crime", regex: /crime|killer|murder|death/i },
  { name: "horror", regex: /horror|haunted|ghost|scary|dark/i },
  { name: "mystery", regex: /mystery|unsolved|missing|unknown/i },
  { name: "real_story", regex: /real|true|story/i },
  { name: "india", regex: /india|indian|hindi|सच्ची|कहानी/i },
  { name: "documentary", regex: /documentary/i }
];

function extractPatterns(title = "") {
  return PATTERNS
    .filter(p => p.regex.test(title))
    .map(p => p.name);
}

function summarizePatterns(videos = []) {
  const counts = {};

  for (const video of videos) {
    const patterns = extractPatterns(video.title || "");

    for (const pattern of patterns) {
      counts[pattern] = (counts[pattern] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a,b) => b.count - a.count);
}

module.exports = {
  extractPatterns,
  summarizePatterns
};
