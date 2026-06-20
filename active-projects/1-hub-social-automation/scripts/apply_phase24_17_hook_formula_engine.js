const fs = require("fs");

const realizerPath = "modules/intelligence/core/story_realizer.js";
let code = fs.readFileSync(realizerPath, "utf8");

if (code.includes("function buildHookFormula")) {
  console.log("Phase 24.17 already applied.");
  process.exit(0);
}

const insertAfter = `function topicTitle(topic = "") {
  return clean(topic).replace(/_/g, " ").replace(/\\s+/g, " ");
}

`;

const hookEngine = `function hashSeed(value = "") {
  return String(value || "").split("").reduce((sum, char) => {
    return sum + char.charCodeAt(0);
  }, 0);
}

function pickSeeded(options = [], seed = "") {
  const usable = options.filter(Boolean);
  if (!usable.length) return "";
  return usable[hashSeed(seed) % usable.length];
}

function buildHookFormula(context = {}, topic = "") {
  const archetype = clean(context.archetype || "general_story");
  const location = clean(context.location_context || "ek jagah");
  const detail = clean(context.trigger_detail || "ek chhoti detail");
  const evidence = clean(context.evidence_object || "ek purana record");
  const tension = clean(context.central_tension || "ek ajeeb problem");
  const seed = [topic, archetype, location, detail, evidence, tension].join("|");

  const hookPools = {
    historical_mystery: [
      "Sadiyon tak ye raaz record me daba raha...",
      "Purane record me ek aisi entry mili jise dekhkar kahani badal gayi...",
      "Itihas ke panne me chhupi ek detail ne sabko confuse kar diya...",
      "Ek purane record ne woh sawal khada kiya jiska jawab aaj tak clear nahi hai...",
      "Jo baat log kahani samajh rahe the, uska zikr record me bhi mila...",
      "Ek forgotten document ne purani kahani ka naya angle khol diya...",
      "Jis incident ko log bhool chuke the, uska saboot achanak saamne aa gaya...",
      "Ek purani file me likhi line ne poori history ko doubtful bana diya..."
    ],

    true_crime_case: [
      "Police ko laga case solve ho chuka hai...",
      "Ek chhoti si detail ne poori investigation badal di...",
      "Case simple lag raha tha, lekin ek clue sab kuch ulta kar gaya...",
      "Investigation band hone wali thi, tab ek nayi baat saamne aayi...",
      "Sabko laga culprit mil gaya, par kahani me ek gap reh gaya...",
      "Ek witness ki baat ne poori file dobara khulwa di...",
      "Jo evidence normal lag raha tha, wahi sabse bada clue nikla...",
      "Case ka asli twist ek ignored detail me chhupa tha..."
    ],

    village_mystery: [
      "Gaon ke log is baat ka naam tak nahi lete the...",
      "Raat hote hi is jagah ke paas koi nahi jaata tha...",
      "Is gaon me ek baat har kisi ko pata thi, par koi bolta nahi tha...",
      "Local log is jagah se door rehna hi safe samajhte the...",
      "Ek chhoti si afwaah ne poore gaon ka mahaul badal diya...",
      "Gaon ki purani kahani tab serious ho gayi jab ek clue mila...",
      "Jahan sab normal dikhta tha, wahi sabse zyada darr chhupa tha...",
      "Is jagah ke baare me buzurg sirf ek warning dete the..."
    ],

    money_lesson_case: [
      "Ek chhoti financial galti ne sab kuch badal diya...",
      "Usne profit samjha, lekin asli kahani kuch aur thi...",
      "Paise ka decision simple lag raha tha, par risk andar chhupa tha...",
      "Ek deal ne shuruat me fayda dikhaya, lekin baad me sab palat gaya...",
      "Jahan profit dikh raha tha, wahi sabse bada trap chhupa tha...",
      "Ek wrong assumption ne poori financial story bigaad di...",
      "Usne warning ignore ki, aur wahi sabse mehngi galti ban gayi...",
      "Money game me ek small detail ne poora result change kar diya..."
    ],

    general_story: [
      "\${topic} me ek aisi baat chhupi thi jise pehle kisi ne seriously nahi liya...",
      "\${topic} ki kahani simple lagti hai, lekin andar ek twist chhupa hai...",
      "\${topic} me ek chhoti detail ne poora angle badal diya...",
      "\${topic} ke peeche jo sach tha, woh pehle kisi ko samajh nahi aaya..."
    ]
  };

  const selectedPool = hookPools[archetype] || hookPools.general_story;
  return pickSeeded(selectedPool, seed).replace(/\\$\\{topic\\}/g, topic);
}

`;

code = code.replace(insertAfter, insertAfter + hookEngine);

code = code.replace(
  `    hook: \`${'${topic}'} me ek aisi baat chhupi thi jise pehle kisi ne seriously nahi liya...\`,`,
  `    hook: buildHookFormula(context, topic),`
);

fs.writeFileSync(realizerPath, code);
console.log("Phase 24.17 Hook Formula Engine applied.");
