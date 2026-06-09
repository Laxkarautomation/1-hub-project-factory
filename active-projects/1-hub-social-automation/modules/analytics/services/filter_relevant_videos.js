const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/youtube_competitor_content.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/relevant_competitor_videos.json"
);

const keywords = [
  "mystery", "mysterious", "unsolved", "secret", "hidden",
  "dark", "horror", "haunted", "ghost", "crime",
  "dangerous", "accident", "crash", "death", "missing",
  "strange", "unknown", "terrifying", "scary", "india",
  "plane", "village", "story", "real", "true"
];

function scoreVideo(video) {
  const title = (video.title || "").toLowerCase();
  let score = 0;

  for (const word of keywords) {
    if (title.includes(word)) score += 1;
  }

  if (video.duration_seconds <= 60) score += 2;
  if (video.duration_seconds > 60 && video.duration_seconds <= 900) score += 1;

  return score;
}

function run() {
  const videos = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const scored = videos
    .map(video => ({
      ...video,
      relevance_score: scoreVideo(video)
    }))
    .filter(video => video.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  fs.writeFileSync(outputPath, JSON.stringify(scored, null, 2));

  console.log("✅ Relevant competitor videos filtered:");
  console.log(outputPath);
  console.log(`Total relevant: ${scored.length}`);
}

run();
