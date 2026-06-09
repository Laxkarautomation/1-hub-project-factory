const fs = require("fs");
const path = require("path");

const inputDir = path.join(
  __dirname,
  "../../../storage/exports/raw/youtube"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/youtube_competitor_content.json"
);

function normalize(item, fileName) {
  return {
    source_platform: "youtube",
    source_name: item.playlist_channel || item.playlist_uploader || fileName.replace(".jsonl", ""),
    source_url: item.playlist_webpage_url || "",

    content_id: item.id || "",
    content_type: item.duration && item.duration <= 60 ? "short" : "video",

    title: item.title || "",
    description: "",

    duration_seconds: item.duration || 0,
    duration_text: item.duration_string || "",

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
  const files = fs.readdirSync(inputDir).filter(file => file.endsWith(".jsonl"));

  const all = [];

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const text = fs.readFileSync(filePath, "utf-8").trim();

    if (!text) {
      console.log(`⚠️ Skipping empty file: ${file}`);
      continue;
    }

    const lines = text.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        const normalized = normalize(item, file);
        if (normalized.content_id && normalized.title) {
          all.push(normalized);
        }
      } catch (err) {
        console.log(`⚠️ Bad line skipped in ${file}`);
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(all, null, 2));

  console.log("✅ All YouTube competitors normalized:");
  console.log(outputPath);
  console.log(`Total normalized: ${all.length}`);
}

run();
