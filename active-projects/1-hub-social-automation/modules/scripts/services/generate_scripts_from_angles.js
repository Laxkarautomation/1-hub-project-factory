const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../../../storage/ideas/story_angles.json");
const outputPath = path.join(__dirname, "../output/unraaz_angle_scripts.json");

const middleLines = {
  haunted_village: [
    "Gaon ke log is kahani ko mazaak nahi mante.",
    "Unke hisaab se kuch jagah aisi hain jahan raat ke baad jaana mana hai.",
    "Sabse ajeeb baat ye hai ki outsiders ne bhi milte-julte experiences bataye."
  ],
  haunted_house: [
    "Is ghar ki kahani sirf ek room se start hoti hai.",
    "Log kehte hain ki raat me andar se awaazein aati thi, jabki ghar khaali hota tha.",
    "Sabse ajeeb baat ye thi ki har naye rehne wale ne ek hi warning repeat ki."
  ],
  haunted_object: [
    "Ye koi normal cheez nahi thi, kyunki iske aane ke baad incidents start hue.",
    "Family ne pehle ise coincidence samjha, par baatein repeat hone lagi.",
    "Sabse scary baat ye thi ki ise hataane ke baad bhi darr khatam nahi hua."
  ],
  true_crime: [
    "Case me saboot the, par kahani simple nahi thi.",
    "Ek chhoti si detail ne investigation ka direction badal diya.",
    "Aaj bhi log is case me police theory aur public theory ko compare karte hain."
  ],
  survival_disaster: [
    "Accident ke baad asli struggle survival ka tha.",
    "Remote location ki wajah se help time par pahunchna almost impossible tha.",
    "Sabse dark sawaal ye tha ki bachne ke liye log kis had tak ja sakte hain."
  ],
  sea_mystery: [
    "Samundar me sabse scary cheez hoti hai evidence ka na milna.",
    "Last signal ke baad kya hua, kisi ko clear pata nahi chala.",
    "Isi wajah se ye incident theory aur mystery ka mix ban gaya."
  ],
  general_mystery: [
    "Is kahani me facts aur afwah itne mix ho gaye ki sach dhundhna mushkil ho gaya.",
    "Logon ki theory alag thi, lekin kuch details baar-baar repeat hoti rahi.",
    "Aur wahi details is mystery ko aur gehra bana deti hain."
  ]
};

function buildScript(item, index) {
  const angle = item.angles[0]?.angle || "Ek mysterious kahani";
  const lines = middleLines[item.sub_theme] || middleLines.general_mystery;

  return {
    script_id: `angle_script_${String(index + 1).padStart(3, "0")}`,
    source_title: item.source_title,
    sub_theme: item.sub_theme,
    selected_angle: angle,
    duration_seconds: 35,
    script: [
      { time: "0-5s", text: angle + "." },
      { time: "5-12s", text: lines[0] },
      { time: "12-20s", text: lines[1] },
      { time: "20-28s", text: lines[2] },
      { time: "28-35s", text: "Aapko kya lagta hai? Sach, coincidence ya kuch aur? Comment me batao." }
    ],
    status: "draft"
  };
}

function run() {
  const angles = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const scripts = angles.slice(0, 10).map(buildScript);

  fs.writeFileSync(outputPath, JSON.stringify(scripts, null, 2));

  console.log("✅ Theme-based angle scripts generated");
  console.log(outputPath);
  console.log(`Total scripts: ${scripts.length}`);
}

run();
