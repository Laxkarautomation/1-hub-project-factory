const fs = require("fs");

const realizerPath = "modules/intelligence/core/story_realizer.js";
let code = fs.readFileSync(realizerPath, "utf8");

if (code.includes("function buildEndingFormula")) {
  console.log("Phase 24.19 already applied.");
  process.exit(0);
}

const insertBefore = `function realizeStory(context = {}) {`;

const endingEngine = `function buildEndingFormula(context = {}, topic = "") {
  const archetype = clean(context.archetype || "general_story");
  const tension = clean(context.central_tension || "ek ajeeb problem");
  const evidence = clean(context.evidence_object || "ek purana record");
  const twist = clean(context.twist_source || "ek purana connection");

  const endingPools = {
    historical_mystery: [
      "Kuch raaz waqt ke saath dhundhle ho jaate hain, lekin records unke nishaan chhod dete hain.",
      "Itihas aksar seedha jawab nahi deta, sirf clues chhodta hai.",
      "Purane records kabhi kabhi woh sach dikha dete hain jise log kahani samajh kar bhool chuke hote hain.",
      "Har historical mystery ye yaad dilati hai ki waqt badal sakta hai, par saboot apni jagah reh jaate hain.",
      "\${topic} hume batata hai ki history ke sabse bade raaz aksar chhoti entries me chhupe hote hain."
    ],

    true_crime_case: [
      "Investigation me sabse bada clue aksar wahi hota hai jise sab ignore kar dete hain.",
      "Har solved case ke peeche kuch unanswered questions reh jaate hain.",
      "Crime stories me sach aksar evidence se kam, ignored details se zyada milta hai.",
      "Ek chhoti si inconsistency kabhi kabhi poori investigation ka direction badal deti hai.",
      "\${topic} ye yaad dilata hai ki case band ho sakta hai, par sawal kabhi kabhi zinda reh jaate hain."
    ],

    village_mystery: [
      "Har afwaah jhooth nahi hoti, lekin har kahani ke peeche ek sach zaroor chhupa hota hai.",
      "Local kahaniyan aksar un baaton ko yaad rakhti hain jo records bhool jaate hain.",
      "Gaon ke raaz aksar awaaz se nahi, logon ki khamoshi se samajh aate hain.",
      "Kabhi kabhi jis baat ka naam log nahi lete, wahi sabse bada clue hoti hai.",
      "\${topic} hume batata hai ki kuch kahaniyan kagaz par nahi, logon ki yaadon me zinda rehti hain."
    ],

    money_lesson_case: [
      "Profit se pehle risk ko samajhna zaroori hota hai.",
      "Financial decisions me chhoti galtiyan sabse mehngi sabit ho sakti hain.",
      "Jahan fayda zyada clean dikhe, wahan risk ko aur dhyan se dekhna chahiye.",
      "Money decisions emotion se nahi, numbers aur risk samajh kar lene chahiye.",
      "\${topic} hume yaad dilata hai ki har profit wali kahani ke peeche risk ka chapter zaroor hota hai."
    ],

    general_story: [
      "\${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.",
      "\${topic} ki kahani batati hai ki sach aksar wahi hota hai jise log pehle ignore kar dete hain.",
      "Kabhi kabhi ek chhoti detail poori kahani ka meaning badal deti hai.",
      "Har kahani me ek layer hoti hai jo tab dikhti hai jab details ko dhyan se dekha jaye."
    ]
  };

  const selectedPool = endingPools[archetype] || endingPools.general_story;
  const seed = [topic, archetype, tension, evidence, twist].join("|ending|");
  return pickSeeded(selectedPool, seed).replace(/\\$\\{topic\\}/g, topic);
}

`;

code = code.replace(insertBefore, endingEngine + insertBefore);

const oldLesson = `    lesson: \`\${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.\``;
const newLesson = `    lesson: buildEndingFormula(context, topic)`;

if (!code.includes(oldLesson)) {
  throw new Error("Expected lesson line not found. Manual audit needed.");
}

code = code.replace(oldLesson, newLesson);

fs.writeFileSync(realizerPath, code);
console.log("Phase 24.19 Ending Variation Engine applied.");
