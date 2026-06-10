const fs = require("fs");
const path = require("path");
const { buildChannelSequenceId, getActiveChannelIdentity } = require("../../channels/channel_identity_helper");

const inputPath = path.join(
  __dirname,
  "../../../storage/ideas/unraaz_offline_ideas.json"
);

const outputPath = path.join(
  __dirname,
  "../output/unraaz_generated_scripts.json"
);

function createScript(idea, index) {
  const title = idea.idea_title.replace("UNRAAZ: ", "");

  return {
    script_id: buildChannelSequenceId("script", index),
    idea_id: idea.idea_id,
    category: idea.category,
    title: idea.idea_title,
    duration_seconds: 35,
    language: "hinglish",
    voice_style: "deep suspense narrator",
    script_lines: [
      {
        time: "0-4s",
        type: "hook",
        text: idea.hook
      },
      {
        time: "4-10s",
        type: "setup",
        text: `Ye kahani ${title} se judi hai, jiske baare me log aaj bhi alag-alag baatein karte hain.`
      },
      {
        time: "10-18s",
        type: "twist",
        text: "Sabse ajeeb baat ye thi ki jitna log sach ke kareeb gaye, utna hi raaz aur gehra hota gaya."
      },
      {
        time: "18-28s",
        type: "suspense",
        text: "Kuch log ise sirf afwah mante hain, lekin wahan ke locals ke experiences kuch aur hi kahani batate hain."
      },
      {
        time: "28-35s",
        type: "ending",
        text: "Aapko kya lagta hai, ye sach tha ya sirf darr ka khel? Comment me batao."
      }
    ],
    source_reference: {
      source_name: idea.source_name,
      source_title: idea.source_title
    },
    status: "draft"
  };
}

function run() {
  const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const scripts = data.ideas.map(createScript);

  fs.writeFileSync(outputPath, JSON.stringify(scripts, null, 2));

  console.log(`✅ ${getActiveChannelIdentity().channelId} scripts generated:`);
  console.log(outputPath);
  console.log(`Total scripts: ${scripts.length}`);
}

run();
