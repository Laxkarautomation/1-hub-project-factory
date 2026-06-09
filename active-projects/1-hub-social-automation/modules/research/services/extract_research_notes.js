const fs = require("fs");
const path = require("path");

const inputPath = path.join(process.cwd(), "storage/ideas/story_angles.json");
const outputPath = path.join(process.cwd(), "modules/research/output/research_notes.json");

function detectEntities(title) {
  const clean = title
    .replace(/\|.*$/g, "")
    .replace(/🔥/g, "")
    .trim();

  const possibleLocation = clean.match(/(?:Village|House|Goa|India|Japan|Hyderabad|Darjeeling|Bemni|D’Mello|Kundanbagh)/gi) || [];
  const possibleEvent = clean.match(/(?:Death|Crash|Accident|Murder|Haunted|Horror|Crime|Story)/gi) || [];

  return {
    clean_title: clean,
    possible_locations: [...new Set(possibleLocation)],
    possible_events: [...new Set(possibleEvent)]
  };
}

function buildNotes(item) {
  const entities = detectEntities(item.source_title);

  return {
    research_id: item.story_angle_id,
    source_title: item.source_title,
    sub_theme: item.sub_theme,
    clean_title: entities.clean_title,
    possible_locations: entities.possible_locations,
    possible_events: entities.possible_events,
    mystery_questions: [
      "Is story ka origin kya hai?",
      "Local belief aur real history me kya difference hai?",
      "Isme sabse strong hook kya ban sakta hai?",
      "Audience ko end me kaunsa question poochna chahiye?"
    ],
    script_improvement_notes: [
      "Generic lines avoid karni hain.",
      "Story me location/person/event ka specific feel lana hai.",
      "Hook first 3 seconds me strong hona chahiye.",
      "Ending comment-worthy question ke saath honi chahiye."
    ],
    status: "research_notes_ready"
  };
}

function run() {
  const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const notes = data.slice(0, 10).map(buildNotes);

  fs.writeFileSync(outputPath, JSON.stringify(notes, null, 2));

  console.log("✅ Research notes extracted");
  console.log(outputPath);
  console.log(`Total notes: ${notes.length}`);
}

run();
