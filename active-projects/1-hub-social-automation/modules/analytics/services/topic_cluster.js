const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/relevant_competitor_videos.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/topic_clusters.json"
);

const topics = {
  haunted: [
    "haunted",
    "ghost",
    "horror",
    "paranormal"
  ],

  crime: [
    "crime",
    "killer",
    "murder",
    "death"
  ],

  mystery: [
    "mystery",
    "unsolved",
    "secret",
    "unknown",
    "hidden"
  ],

  disaster: [
    "crash",
    "accident",
    "plane",
    "ship"
  ],

  places: [
    "village",
    "house",
    "island",
    "forest",
    "hotel"
  ]
};

function run() {
  const videos = JSON.parse(
    fs.readFileSync(inputPath, "utf8")
  );

  const result = {};

  Object.keys(topics).forEach(topic => {
    result[topic] = {
      count: 0,
      examples: []
    };
  });

  for (const video of videos) {
    const title = (video.title || "").toLowerCase();

    for (const [topic, words] of Object.entries(topics)) {
      const matched = words.some(word =>
        title.includes(word)
      );

      if (matched) {
        result[topic].count++;

        if (result[topic].examples.length < 10) {
          result[topic].examples.push(video.title);
        }
      }
    }
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(result, null, 2)
  );

  console.log("✅ Topic clusters created");
  console.log(outputPath);
}
run();
