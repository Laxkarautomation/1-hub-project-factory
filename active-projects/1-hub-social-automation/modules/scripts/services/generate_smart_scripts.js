const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../../../storage/ideas/story_angles.json");
const outputPath = path.join(__dirname, "../output/unraaz_smart_scripts.json");

const templates = {
  haunted_village: {
    opener: "India ke ek aise gaon ki kahani, jahan suraj dhalte hi mahaul badal jaata hai.",
    build: "Local log kehte hain ki raat ke baad kuch raaste aise hain jahan jaana mana hai.",
    twist: "Ajeeb baat ye hai ki alag-alag logon ne ek jaisi awaazein aur shadows notice ki.",
    close: "Science ise fear bolta hai, lekin locals ke liye ye aaj bhi ek warning hai."
  },
  haunted_house: {
    opener: "Ek purana ghar, jahan rehne wale log zyada din ruk nahi paaye.",
    build: "Kahani ek locked room se start hoti hai, jise family ne saalon tak band rakha.",
    twist: "Raat me footsteps aur awaazein sunai deti thi, jabki ghar khaali hota tha.",
    close: "Kya ye imagination tha, ya us ghar me sach me kuch chhupa tha?"
  },
  haunted_object: {
    opener: "Kabhi-kabhi darr kisi jagah se nahi, ek object se shuru hota hai.",
    build: "Ye cheez ghar me aane ke baad chhote incidents repeat hone lage.",
    twist: "Family ne pehle ise coincidence maana, par jab pattern same raha to sab dar gaye.",
    close: "Sabse scary baat — use hataane ke baad bhi incidents rukhe nahi."
  },
  true_crime: {
    opener: "Ek case jahan last phone call ne poori investigation ka direction badal diya.",
    build: "Saboot maujood the, lekin motive itna clear nahi tha.",
    twist: "Ek chhoti si detail ignore hui, aur wahi detail baad me sabse important nikli.",
    close: "Aaj bhi is case me public theory aur official story match nahi karti."
  },
  survival_disaster: {
    opener: "Ek accident ke baad asli kahani crash ki nahi, survival ki thi.",
    build: "Remote location ki wajah se rescue almost impossible ho gaya.",
    twist: "Bachne ke liye logon ko aise decisions lene pade jinke baare me sochna bhi mushkil hai.",
    close: "Aur isi wajah se ye story accident se zyada ek dark mystery ban gayi."
  },
  general_mystery: {
    opener: "Ek kahani jahan sach aur afwah itne mix ho gaye ki boundary hi gayab ho gayi.",
    build: "Logon ne theories banayi, par kuch facts baar-baar repeat hote rahe.",
    twist: "Jitna zyada log investigate karte gaye, utne naye sawaal khade hote gaye.",
    close: "End me sawal bas ek hai — coincidence ya carefully hidden truth?"
  }
};

function pickTemplate(subTheme) {
  return templates[subTheme] || templates.general_mystery;
}

function buildSmartScript(item, index) {
  const t = pickTemplate(item.sub_theme);
  const angle = item.angles[0]?.angle || "Ek mysterious kahani";

  return {
    script_id: `smart_script_${String(index + 1).padStart(3, "0")}`,
    source_title: item.source_title,
    sub_theme: item.sub_theme,
    selected_angle: angle,
    duration_seconds: 35,
    voice_style: "deep suspense narrator",
    script: [
      { time: "0-4s", text: angle + "." },
      { time: "4-10s", text: t.opener },
      { time: "10-18s", text: t.build },
      { time: "18-28s", text: t.twist + " " + t.close },
      { time: "28-35s", text: "Aapko kya lagta hai — sach, darr ya coincidence? Comment me batao." }
    ],
    status: "smart_draft"
  };
}

function run() {
  const angles = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const scripts = angles.slice(0, 10).map(buildSmartScript);

  fs.writeFileSync(outputPath, JSON.stringify(scripts, null, 2));

  console.log("✅ Smart scripts generated");
  console.log(outputPath);
  console.log(`Total scripts: ${scripts.length}`);
}

run();
