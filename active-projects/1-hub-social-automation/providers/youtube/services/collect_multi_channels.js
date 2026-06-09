const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputDir = path.join(__dirname, "../../../storage/exports/raw/youtube");
fs.mkdirSync(outputDir, { recursive: true });

const channels = [
  { name: "facttechz", url: "https://www.youtube.com/@FactTechz/videos" },
  { name: "khooni-monday", url: "https://www.youtube.com/@KhooniMonday/videos" },
  { name: "trs-clips", url: "https://www.youtube.com/@TRSClips/videos" },

  { name: "raaz-by-biggbrainco", url: "https://www.youtube.com/@RaazbyBiggBrainco/videos" },
  { name: "detective-diary", url: "https://www.youtube.com/@DetectiveDiary/videos" },
  { name: "mystery-recaps", url: "https://www.youtube.com/@MysteryRecaps/videos" },
  { name: "mr-nightmare", url: "https://www.youtube.com/@MrNightmare/videos" },
  { name: "thoughty2", url: "https://www.youtube.com/@Thoughty2/videos" },
  { name: "real-stories", url: "https://www.youtube.com/@RealStories/videos" },
  { name: "dark5", url: "https://www.youtube.com/@dark5tv/videos" },
  { name: "top5s", url: "https://www.youtube.com/@Top5s/videos" },
  { name: "be-amazed", url: "https://www.youtube.com/@BEAMAZED/videos" },
  { name: "buzzfeed-unsolved", url: "https://www.youtube.com/@BuzzFeedUnsolvedNetwork/videos" }
];

for (const channel of channels) {
  const outputFile = path.join(outputDir, `${channel.name}.jsonl`);

  console.log(`\n▶ Collecting: ${channel.name}`);
  console.log(channel.url);

  try {
    execSync(
      `yt-dlp --flat-playlist --dump-json "${channel.url}" > "${outputFile}"`,
      { stdio: "inherit" }
    );

    const lines = fs.existsSync(outputFile)
      ? fs.readFileSync(outputFile, "utf-8").split("\n").filter(Boolean).length
      : 0;

    console.log(`✅ Saved ${lines} videos → ${outputFile}`);
  } catch (err) {
    console.log(`❌ Failed: ${channel.name}`);
  }
}
