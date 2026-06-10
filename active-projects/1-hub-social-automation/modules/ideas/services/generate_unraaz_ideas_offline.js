const fs = require("fs");
const path = require("path");
const { buildChannelSequenceId, getActiveChannelIdentity } = require("../../channels/channel_identity_helper");

const clustersPath = path.join(
  __dirname,
  "../../../storage/exports/normalized/topic_clusters.json"
);

const topInputPath = path.join(
  __dirname,
  "../../../storage/ideas/top_ideas_input.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/ideas/unraaz_offline_ideas.json"
);

function cleanTitle(title) {
  return title
    .replace(/\|.*$/g, "")
    .replace(/🔥/g, "")
    .replace(/सच्ची कहानी/g, "")
    .trim();
}

function buildIdea(video, index) {
  const title = cleanTitle(video.title);

  let category = "mystery";
  if (/haunted|horror|ghost|bhoot|भूत/i.test(title)) category = "haunted";
  if (/crime|murder|killer|death/i.test(title)) category = "crime";
  if (/crash|accident|plane|ship/i.test(title)) category = "disaster";
  if (/village|house|goa|delhi|hyderabad|darjeeling/i.test(title)) category = "haunted_place";

  const hooks = {
    haunted: `Kya ${title} ke peeche sach me koi paranormal raaz chhupa hai?`,
    crime: `Is case me sabse ajeeb baat ye thi ki sach saamne hote hue bhi log samajh nahi paaye.`,
    disaster: `Ye accident sirf accident nahi tha, iske peeche ek dark secret chhupa tha.`,
    haunted_place: `India ki is jagah ko log haunted bolte hain, par asli kahani aur zyada darawani hai.`,
    mystery: `Is kahani me ek aisa twist hai jo end tak samajh nahi aata.`
  };

  return {
    idea_id: buildChannelSequenceId("idea", index),
    based_on_rank: video.rank,
    source_name: video.source_name,
    source_title: video.title,
    idea_title: `UNRAAZ: ${title} ka asli raaz`,
    category,
    hook: hooks[category],
    why_it_can_work: "Competitor data me is topic/category ka strong relevance score mila hai.",
    target_duration_seconds: 35,
    status: "new"
  };
}

function run() {
  const clusters = JSON.parse(fs.readFileSync(clustersPath, "utf-8"));
  const topInput = JSON.parse(fs.readFileSync(topInputPath, "utf-8"));

  const ideas = topInput.slice(0, 10).map(buildIdea);

  const output = {
    generated_by: "offline_rule_based_generator",
    project: getActiveChannelIdentity().channelId,
    cluster_summary: {
      haunted: clusters.haunted?.count || 0,
      mystery: clusters.mystery?.count || 0,
      crime: clusters.crime?.count || 0,
      disaster: clusters.disaster?.count || 0,
      places: clusters.places?.count || 0
    },
    ideas
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ Offline ${getActiveChannelIdentity().channelId} ideas generated:`);
  console.log(outputPath);
  console.log(`Total ideas: ${ideas.length}`);
}

run();
