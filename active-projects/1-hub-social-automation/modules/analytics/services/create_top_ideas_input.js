const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/relevant_competitor_videos.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/ideas/top_ideas_input.json"
);

const bannedWords = [
  "trailer",
  "bloopers",
  "outtakes",
  "season",
  "episode",
  "podcast",
  "compilation"
];

function isClean(video) {
  const title = (video.title || "").toLowerCase();
  return !bannedWords.some(word => title.includes(word));
}

function run() {
  const videos = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const top = videos
    .filter(isClean)
    .slice(0, 25)
    .map((video, index) => ({
      rank: index + 1,
      source_name: video.source_name,
      title: video.title,
      duration_text: video.duration_text,
      content_url: video.content_url,
      relevance_score: video.relevance_score
    }));

  fs.writeFileSync(outputPath, JSON.stringify(top, null, 2));

  console.log("✅ Clean top ideas input created:");
  console.log(outputPath);
  console.log(`Total selected: ${top.length}`);
}

run();
