const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

const outputPath = path.join(
  __dirname,
  "../../../storage/exports/raw/youtube_rss_raw.json"
);

const feeds = [
  {
    name: "FactTechz",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCGdPm5Aq081vVD7ih9jZf6Q"
  }
];

async function fetchFeed(feed) {
  const res = await fetch(feed.feedUrl);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${feed.name}: ${res.status}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  const entries = data.feed.entry || [];

  return entries.map((entry) => ({
    platform: "youtube",
    channel: feed.name,
    channel_url: data.feed.link?.[1]?.["@_href"] || "",
    video_id: entry["yt:videoId"],
    type: "video",
    title: entry.title,
    description: entry["media:group"]?.["media:description"] || "",
    views: 0,
    likes: 0,
    comments: 0,
    published_at: entry.published,
    url: entry.link?.["@_href"] || "",
    tags: []
  }));
}

async function run() {
  const allVideos = [];

  for (const feed of feeds) {
    console.log(`Fetching: ${feed.name}`);
    const videos = await fetchFeed(feed);
    allVideos.push(...videos);
  }

  fs.writeFileSync(outputPath, JSON.stringify(allVideos, null, 2));

  console.log("✅ YouTube RSS raw data saved:");
  console.log(outputPath);
  console.log(`Total videos: ${allVideos.length}`);
}

run().catch((err) => {
  console.error("❌ YouTube RSS Collector failed:");
  console.error(err.message);
  process.exit(1);
});
