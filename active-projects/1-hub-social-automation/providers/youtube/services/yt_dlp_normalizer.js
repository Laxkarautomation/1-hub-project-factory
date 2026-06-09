const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/exports/raw/facttechz_yt_dlp.jsonl"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/competitor_content.json"
);

function normalize(item) {
  return {
    source_platform: "youtube",
    source_name: item.playlist_channel || item.playlist_uploader || "",
    source_url: item.playlist_webpage_url || "",

    content_id: item.id || "",
    content_type: item.duration && item.duration <= 60 ? "short" : "video",

    title: item.title || "",
    description: "",

    views: 0,
    likes: 0,
    comments: 0,

    published_at: "",
    collected_at: new Date().toISOString(),

    content_url: item.url || item.webpage_url || "",
    thumbnail_url: item.thumbnails?.[0]?.url || "",

    transcript: "",
    tags: [],
    category: "facts_mystery",
    status: "new"
  };
}

function run() {
  const lines = fs.readFileSync(inputPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  const normalized = lines
    .map(line => JSON.parse(line))
    .map(normalize)
    .slice(0, 25);

  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));

  console.log("✅ yt-dlp data normalized:");
  console.log(outputPath);
  console.log(`Total normalized: ${normalized.length}`);
}

run();
