const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../../scripts/output/unraaz_research_scripts.json");
const outputPath = path.join(__dirname, "../output/unraaz_captions.json");

const hashtags = {
  haunted_village: ["#UNRAAZ", "#HauntedVillage", "#Mystery", "#HorrorStory", "#IndiaMystery"],
  haunted_house: ["#UNRAAZ", "#HauntedHouse", "#RealHorror", "#Mystery", "#DarkStory"],
  haunted_object: ["#UNRAAZ", "#HauntedObject", "#HorrorMystery", "#ScaryStory", "#DarkFacts"],
  true_crime: ["#UNRAAZ", "#TrueCrime", "#UnsolvedMystery", "#CrimeStory", "#DarkTruth"],
  survival_disaster: ["#UNRAAZ", "#SurvivalStory", "#PlaneCrash", "#DarkSecret", "#MysteryFacts"],
  general_mystery: ["#UNRAAZ", "#MysteryFacts", "#DarkStory", "#UnknownFacts", "#Suspense"]
};

function titleFromScript(script) {
  return script.selected_angle
    .replace(/\.$/, "")
    .slice(0, 65);
}

function run() {
  const scripts = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const captions = scripts.map(script => ({
    script_id: script.script_id,
    title: titleFromScript(script),
    caption: `${script.selected_angle}...\n\nIs kahani me sach, darr aur coincidence ke beech ek ajeeb connection dikhta hai.\n\nAapko kya lagta hai? Comment me batao.`,
    cta: "Sach ya coincidence? Comment me batao.",
    hashtags: hashtags[script.sub_theme] || hashtags.general_mystery,
    platform: ["instagram_reel", "youtube_short"],
    status: "ready"
  }));

  fs.writeFileSync(outputPath, JSON.stringify(captions, null, 2));

  console.log("✅ Captions generated");
  console.log(outputPath);
  console.log(`Total captions: ${captions.length}`);
}

run();
