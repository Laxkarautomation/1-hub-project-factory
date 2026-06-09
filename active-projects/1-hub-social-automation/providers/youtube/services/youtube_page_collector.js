const fs = require("fs");
const path = require("path");

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/raw/youtube_page_raw.json"
);

const channels = [
  {
    name: "FactTechz",
    url: "https://www.youtube.com/@FactTechz/videos"
  }
];

function findVideoRenderers(obj, results = []) {
  if (!obj || typeof obj !== "object") return results;

  if (obj.videoRenderer) {
    results.push(obj.videoRenderer);
  }

  for (const key of Object.keys(obj)) {
    findVideoRenderers(obj[key], results);
  }

  return results;
}

function extractInitialData(html) {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);

  if (start === -1) {
    throw new Error("ytInitialData not found");
  }

  const jsonStart = start + marker.length;
  const end = html.indexOf(";</script>", jsonStart);

  if (end === -1) {
    throw new Error("ytInitialData end not found");
  }

  const jsonText = html.slice(jsonStart, end);
  return JSON.parse(jsonText);
}

function extractText(obj) {
  if (!obj) return "";
  if (obj.simpleText) return obj.simpleText;
  if (obj.runs && obj.runs[0] && obj.runs[0].text) return obj.runs[0].text;
  return "";
}

function extractVideos(html, channel) {
  const initialData = extractInitialData(html);
  const renderers = findVideoRenderers(initialData);

  const videos = renderers.map((v) => ({
    platform: "youtube",
    channel: channel.name,
    channel_url: channel.url,
    video_id: v.videoId || "",
    type: "video",
    title: extractText(v.title),
    description: "",
    views_text: extractText(v.viewCountText),
    views: 0,
    likes: 0,
    comments: 0,
    published_at_text: extractText(v.publishedTimeText),
    published_at: "",
    url: v.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : "",
    tags: []
  })).filter(v => v.video_id && v.title);

  const unique = [];
  const seen = new Set();

  for (const video of videos) {
    if (!seen.has(video.video_id)) {
      seen.add(video.video_id);
      unique.push(video);
    }
  }

  return unique.slice(0, 10);
}

async function fetchChannelPage(channel) {
  const res = await fetch(channel.url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${channel.name}: ${res.status}`);
  }

  const html = await res.text();
  return extractVideos(html, channel);
}

async function run() {
  const allVideos = [];

  for (const channel of channels) {
    console.log(`Fetching page: ${channel.name}`);
    const videos = await fetchChannelPage(channel);
    allVideos.push(...videos);
  }

  fs.writeFileSync(outputPath, JSON.stringify(allVideos, null, 2));

  console.log("✅ YouTube page raw data saved:");
  console.log(outputPath);
  console.log(`Total videos: ${allVideos.length}`);
}

run().catch((err) => {
  console.error("❌ YouTube Page Collector failed:");
  console.error(err.message);
  process.exit(1);
});
