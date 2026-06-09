const fs = require("fs");
const path = require("path");

const anglesPath = path.join(process.cwd(), "storage/ideas/story_angles.json");
const researchPath = path.join(process.cwd(), "modules/research/output/research_notes.json");
const outputPath = path.join(process.cwd(), "modules/scripts/output/unraaz_research_scripts.json");

function extractMainName(note) {
  let title = note.clean_title || "ye kahani";

  title = title
    .replace(/India'?s Most Haunted Village\s*-\s*/i, "")
    .replace(/India'?s Most Haunted House\s*-\s*/i, "")
    .replace(/India'?s Most Haunted\s*/i, "")
    .replace(/\s*-\s*India'?s\s*$/i, "")
    .replace(/\s*-\s*India'?s Most Haunted\s*/i, "")
    .replace(/\s*-\s*Most Haunted\s*/i, "")
    .replace(/Real Horror Story/i, "")
    .replace(/Horror Story/i, "")
    .replace(/True Crime/i, "")
    .replace(/Most Haunted/i, "")
    .replace(/\s+/g, " ")
    .trim();

  title = title.replace(/^Village\s*-\s*/i, "").trim();

  return title || note.clean_title || "ye kahani";
}

function buildSpecificLine(note) {
  const name = extractMainName(note);

  if (note.sub_theme === "haunted_village") {
    return `${name} ek aise gaon ke roop me jaana jaata hai jahan raat ke baad log rukne se darte hain.`;
  }

  if (note.sub_theme === "haunted_house") {
    return `${name} ki kahani ek purane ghar, locked rooms aur ajeeb awaazon ke around ghoomti hai.`;
  }

  if (note.sub_theme === "haunted_object") {
    return `${name} me darr kisi jagah se nahi, ek object se start hota hai.`;
  }

  if (note.sub_theme === "true_crime") {
    return `${name} me sabse bada sawaal official story aur public theory ke beech ka gap hai.`;
  }

  if (note.sub_theme === "survival_disaster") {
    return `${name} me crash ke baad survival ka angle sabse zyada shocking ban jaata hai.`;
  }

  return `${name} sirf ek kahani nahi, balki ek aisa mystery case hai jisme sawaal jawab se zyada hain.`;
}

function buildScript(angleItem, note, index) {
  const angle = angleItem.angles[0]?.angle || "Ek mysterious kahani";
  const specificLine = buildSpecificLine(note);

  return {
    script_id: `research_script_${String(index + 1).padStart(3, "0")}`,
    source_title: angleItem.source_title,
    clean_title: note.clean_title,
    sub_theme: angleItem.sub_theme,
    selected_angle: angle,
    duration_seconds: 35,
    voice_style: "deep suspense narrator",
    script: [
      { time: "0-4s", text: angle + "." },
      { time: "4-10s", text: specificLine },
      { time: "10-18s", text: "Local stories aur available details is case ko normal incident se alag banate hain." },
      { time: "18-28s", text: "Sabse interesting baat ye hai ki is story me facts, fear aur public theories ek dusre se mix ho jaate hain." },
      { time: "28-35s", text: "Aapko kya lagta hai — ye sach tha, fear tha, ya ek hidden truth? Comment me batao." }
    ],
    research_used: {
      possible_locations: note.possible_locations,
      possible_events: note.possible_events
    },
    status: "research_draft"
  };
}

function run() {
  const angles = JSON.parse(fs.readFileSync(anglesPath, "utf-8"));
  const notes = JSON.parse(fs.readFileSync(researchPath, "utf-8"));

  const scripts = angles.slice(0, 10).map((angleItem, index) => {
    const note = notes[index];
    return buildScript(angleItem, note, index);
  });

  fs.writeFileSync(outputPath, JSON.stringify(scripts, null, 2));

  console.log("✅ Cleaner research-aware scripts generated");
  console.log(outputPath);
  console.log(`Total scripts: ${scripts.length}`);
}

run();
