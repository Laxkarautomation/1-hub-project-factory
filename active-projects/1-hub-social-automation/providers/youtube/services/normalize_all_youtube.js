const fs = require("fs");
const path = require("path");

const inputDir = path.join(__dirname, "../../../storage/exports/raw/youtube");
const outputPath = path.join(__dirname, "../../../storage/exports/normalized/youtube_competitor_content.json");

function compactText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDate(value = "") {
  const raw = String(value || "").trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
}

function bestThumbnail(thumbnails = []) {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return "";
  const sorted = [...thumbnails].sort((a, b) => Number(b.width || 0) - Number(a.width || 0));
  return sorted[0]?.url || "";
}

function normalize(item, fileName) {
  const views = Number(item.view_count || item.views || 0);
  const likes = Number(item.like_count || item.likes || 0);
  const comments = Number(item.comment_count || item.comments || 0);

  return {
    source_platform: "youtube",
    source_name: item.playlist_channel || item.channel || item.uploader || item.playlist_uploader || fileName.replace(".jsonl", ""),
    source_url: item.playlist_webpage_url || item.channel_url || "",

    content_id: item.id || "",
    content_type: item.duration && item.duration <= 60 ? "short" : "video",

    title: compactText(item.title || ""),
    description: compactText(item.description || ""),

    duration_seconds: Number(item.duration || 0),
    duration_text: item.duration_string || "",

    views,
    likes,
    comments,

    published_at: normalizeDate(item.upload_date || item.release_date || item.timestamp || ""),
    collected_at: new Date().toISOString(),

    content_url: item.webpage_url || item.original_url || item.url || "",
    thumbnail_url: bestThumbnail(item.thumbnails) || item.thumbnail || "",

    transcript: compactText(item.transcript || ""),
    tags: Array.isArray(item.tags) ? item.tags.map(compactText).filter(Boolean) : [],

    engagement_score: views > 0 ? Number(((likes + comments * 3) / views).toFixed(6)) : 0,
    viral_score: views + likes * 5 + comments * 10,

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

    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const item = JSON.parse(line);
        const normalized = normalize(item, file);
        if (normalized.content_id && normalized.title) all.push(normalized);
      } catch {
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
