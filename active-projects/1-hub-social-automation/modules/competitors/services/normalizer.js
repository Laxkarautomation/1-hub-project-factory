const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/exports/raw/youtube_sample.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/competitor_content.json"
);

function normalizeYouTube(item) {
  return {
    source_platform: item.platform || "youtube",
    source_name: item.channel || "",
    source_url: item.channel_url || "",

    content_id: item.video_id || "",
    content_type: item.type || "video",

    title: item.title || "",
    description: item.description || "",

    views: item.views || 0,
    likes: item.likes || 0,
    comments: item.comments || 0,

    published_at: item.published_at || "",
    collected_at: new Date().toISOString(),

    content_url: item.url || "",

    transcript: "",
    tags: item.tags || [],
    category: "mystery",
    status: "new"
  };
}

function run() {
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const normalized = raw.map(normalizeYouTube);

  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));

  console.log("✅ Normalized content saved:");
  console.log(outputPath);
}

run();
