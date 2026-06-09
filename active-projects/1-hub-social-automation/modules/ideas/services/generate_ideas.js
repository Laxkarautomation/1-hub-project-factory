const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/competitor_content.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/ideas/generated_ideas.json"
);

function createIdeas(item) {
  return [
    {
      source_content_id: item.content_id,
      idea_title: `${item.title} ke peeche ki asli kahani`,
      angle: "Mystery + curiosity",
      hook: "Kya aap jaante ho is kahani ka sach kuch aur hi tha?",
      target_platform: "instagram_reel_youtube_short",
      status: "new"
    },
    {
      source_content_id: item.content_id,
      idea_title: `${item.source_name} style me ek dark mystery short`,
      angle: "Viral competitor-inspired format",
      hook: "Ye incident sunke aap raat ko sochne par majboor ho jaoge.",
      target_platform: "instagram_reel_youtube_short",
      status: "new"
    }
  ];
}

function run() {
  const content = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const ideas = content.flatMap(createIdeas);

  fs.writeFileSync(outputPath, JSON.stringify(ideas, null, 2));

  console.log("✅ Ideas generated:");
  console.log(outputPath);
}

run();
