const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../../../storage/ideas/top_ideas_input.json");
const outputPath = path.join(__dirname, "../../../storage/ideas/story_angles.json");

function detectSubTheme(title) {
  const t = title.toLowerCase();

  if (/village|gaon/.test(t)) return "haunted_village";
  if (/house|mansion|bungalow|haveli/.test(t)) return "haunted_house";
  if (/doll|toy|puppet/.test(t)) return "haunted_object";
  if (/death|murder|killer|crime/.test(t)) return "true_crime";
  if (/plane|crash|accident/.test(t)) return "survival_disaster";
  if (/ship|sea|island/.test(t)) return "sea_mystery";

  return "general_mystery";
}

const angleBank = {
  haunted_village: [
    "Ek gaon jahan suraj dhalne ke baad galiyan khaali ho jaati hain",
    "Gaon ke log ek purani ghatna ka naam lene se bhi darte hain",
    "Raat me sunai dene wali awaazon ka asli source aaj tak clear nahi",
    "Ek mandir, ek raasta, aur ek warning jo har outsider ko di jaati hai",
    "Jahan science explanation deta hai, lekin locals usse maanne ko taiyar nahi"
  ],

  haunted_house: [
    "Ek ghar jahan naye rehne wale zyada din tik nahi paate",
    "Band kamre ki wo kahani jise family ne saalon tak chupaya",
    "Raat me lights, footsteps aur ek locked door ka mystery",
    "Padosiyon ke mutabik ghar khaali tha, phir awaaz kahan se aati thi",
    "Ek property jise kharidne ke baad logon ki zindagi badal gayi"
  ],

  haunted_object: [
    "Ek object jo ghar me aate hi ajeeb incidents start kar deta hai",
    "Log kehte hain is cheez ko hataane ke baad bhi problem khatam nahi hui",
    "Ek doll/object jise log normal samajhte rahe, par history kuch aur thi",
    "Jis cheez ko bachchon ka toy samjha gaya, wahi sabse bada darr ban gaya",
    "Is object se judi kahani me coincidence kuch zyada hi baar hua"
  ],

  true_crime: [
    "Ek case jahan last phone call ne poori story badal di",
    "Saboot saamne the, par killer ka motive clear nahi hua",
    "Police report aur public theory ek dusre se bilkul alag thi",
    "Victim ki last location ne sabko confuse kar diya",
    "Ek chhoti detail jise ignore kiya gaya, wahi sabse important nikli"
  ],

  survival_disaster: [
    "Ek accident jahan bachne ke liye logon ko unimaginable decision lena pada",
    "Crash ke baad ke pehle 24 ghante sabse zyada dangerous the",
    "Official report ek baat kehti hai, survivors kuch aur",
    "Remote location ne rescue ko almost impossible bana diya",
    "Survival ke naam par jo hua, usne duniya ko shock kar diya"
  ],

  sea_mystery: [
    "Samundar me gayab hui cheez ka raaz kabhi clear nahi hua",
    "Ek ship jahan crew tha, par jawab nahi",
    "Sea route normal tha, phir bhi incident impossible laga",
    "Last signal ke baad kya hua, kisi ko nahi pata",
    "Water mystery me sabse scary baat hoti hai — evidence ka na milna"
  ],

  general_mystery: [
    "Ek kahani jahan sach aur afwah ek jaise lagne lage",
    "Logon ki theory alag thi, par facts kuch aur bol rahe the",
    "Ek hidden detail jisne poori kahani ka direction badal diya",
    "Jitna zyada log investigate karte gaye, mystery utni gehri hoti gayi",
    "End me sawal bas ek bacha — ye coincidence tha ya planning"
  ]
};

function run() {
  const input = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const output = input.map((item, index) => {
    const subTheme = detectSubTheme(item.title);

    return {
      story_angle_id: `story_angle_set_${String(index + 1).padStart(3, "0")}`,
      source_rank: item.rank,
      source_name: item.source_name,
      source_title: item.title,
      sub_theme: subTheme,
      angles: angleBank[subTheme].map((angle, i) => ({
        angle_id: `angle_${i + 1}`,
        angle
      })),
      status: "new"
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("✅ Smarter story angles extracted:");
  console.log(outputPath);
  console.log(`Total angle sets: ${output.length}`);
}

run();
