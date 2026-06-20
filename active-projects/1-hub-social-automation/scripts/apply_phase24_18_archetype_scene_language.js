const fs = require("fs");

const realizerPath = "modules/intelligence/core/story_realizer.js";
let code = fs.readFileSync(realizerPath, "utf8");

if (code.includes("function applySceneTemplate")) {
  console.log("Phase 24.18 already applied.");
  process.exit(0);
}

const insertBefore = `function realizeStory(context = {}) {`;

const sceneEngine = `function applySceneTemplate(template = "", values = {}) {
  return String(template || "").replace(/\\$\\{([a-zA-Z0-9_]+)\\}/g, (_, key) => {
    return values[key] || "";
  });
}

function buildSceneTemplates(context = {}) {
  const archetype = clean(context.archetype || "general_story");

  const scenePools = {
    historical_mystery: {
      setup: [
        "Purane record aur local references ke mutabik, kahani \${location} se shuru hoti hai. Bahar se sab normal lagta tha, lekin background me ek \${atmosphere} layer chhupi thi.",
        "Archive me milne wali details \${location} ki taraf ishara karti hain. Pehli nazar me ye ordinary jagah lagti thi, par documents kuch aur keh rahe the.",
        "Itihas ke purane pages me \${location} ka zikr baar baar aata hai. Yahin se ek \${atmosphere} kahani dheere dheere shape lene lagi."
      ],
      conflict: [
        "Lekin documents me \${tension} ka contradiction saamne aaya. \${escalation1}. Isi mismatch ne puri kahani ko doubtful bana diya.",
        "Problem tab shuru hui jab record aur oral story match nahi hue. \${escalation1}. Jo baat simple lag rahi thi, usme gap dikhne laga.",
        "Purani file me \${tension} ka angle clear nahi tha. \${escalation1}. Yahin se doubt strong hone laga."
      ],
      clue: [
        "Investigation purane archive tak pahunchi, jahan \${detail} se judi information mili. Uske baad \${evidence} sabse important point ban gaya.",
        "Ek archived note me \${detail} ka reference mila. Phir \${evidence} ne purane version par sawal khade kar diye.",
        "Jab old records compare kiye gaye, to \${detail} ka link dikha. Isi link ne \${evidence} ko center me la diya."
      ],
      escalation: [
        "\${escalation2}. Phir \${escalation3}. Ab ye sirf history nahi, ek unresolved mystery ban chuki thi.",
        "\${escalation2}. Baad me \${escalation3}. Jitne clues milte gaye, utna record aur confusing hota gaya.",
        "\${escalation2}. Aur jab \${escalation3}, tab purani kahani ka hidden layer saamne aane laga."
      ],
      twist: [
        "Jab sabhi records connect kiye gaye, to \${twist} se ek unexpected link nikla. Isi ne purani kahani ka asli angle badal diya.",
        "Final comparison me \${twist} ka connection mila. Yahin se samajh aaya ki original story incomplete thi.",
        "Saboot ek jagah rakhne par \${twist} ka role saamne aaya. Is twist ne poora historical angle palat diya."
      ]
    },

    true_crime_case: {
      setup: [
        "Shuruaat \${location} me ek routine investigation se hui. Sabko laga case straightforward hai, lekin atmosphere me ek \${atmosphere} pressure tha.",
        "Case \${location} se start hua, jahan initial details normal dikh rahi thi. Lekin investigation team ko jaldi hi kuch off feel hua.",
        "\${location} me pehli report simple thi. Par scene ka mahaul aur statements ek \${atmosphere} direction me ja rahe the."
      ],
      conflict: [
        "Lekin \${tension} ne case ko complicated bana diya. \${escalation1}. Statement aur evidence ek dusre se match nahi kar rahe the.",
        "Problem tab aayi jab primary version me gaps mile. \${escalation1}. Jo timeline ban rahi thi, woh stable nahi thi.",
        "Investigation me \${tension} ka angle enter hua. \${escalation1}. Yahin se case simple se suspicious ban gaya."
      ],
      clue: [
        "Forensic review me \${detail} se judi ek nayi detail saamne aayi. Uske baad \${evidence} par focus shift ho gaya.",
        "Evidence check karte waqt \${detail} ka point notice hua. Phir \${evidence} ne investigation ki direction badal di.",
        "Case file me \${detail} ka ek ignored reference mila. Isi ke baad \${evidence} sabse bada clue ban gaya."
      ],
      escalation: [
        "\${escalation2}. Phir \${escalation3}. Ab investigation ek naye track par chali gayi.",
        "\${escalation2}. Baad me \${escalation3}. Jitna case khulta gaya, utne naye doubts badhte gaye.",
        "\${escalation2}. Aur jab \${escalation3}, tab case ka asli pressure saamne aaya."
      ],
      twist: [
        "Jab clues connect hue, to \${twist} ka link nikla. Isi link ne poori investigation ka angle badal diya.",
        "Final review me \${twist} saamne aaya. Tab samajh aaya ki case ka sabse important point pehle ignore ho gaya tha.",
        "Evidence chain complete hui to \${twist} ne unexpected turn de diya. Yahin se asli story khuli."
      ]
    },

    village_mystery: {
      setup: [
        "Gaon me ye baat kaafi saalon se chal rahi thi. Kahani \${location} se judi thi, aur mahaul me ek \${atmosphere} darr mehsoos hota tha.",
        "\${location} ke aas paas log aaj bhi dheere awaaz me baat karte hain. Bahar se sab normal, lekin andar ek ajeeb silence tha.",
        "Is gaon me \${location} ka naam aate hi log topic badal dete the. Yahin se ek \${atmosphere} kahani shuru hoti hai."
      ],
      conflict: [
        "Log \${tension} par khulkar baat nahi karte the. \${escalation1}. Isi silence ne matter ko aur suspicious bana diya.",
        "Problem ye thi ki har kisi ke paas kahani thi, par koi proof nahi de raha tha. \${escalation1}. Gaon ka माहौल heavy hone laga.",
        "Jab \${tension} ki baat uthti, log chup ho jaate. \${escalation1}. Yahi reaction sabse ajeeb tha."
      ],
      clue: [
        "Ek local gawah ne \${detail} se judi alag kahani batayi. Uske baad \${evidence} par sabki nazar gayi.",
        "Gaon ke ek purane aadmi ne \${detail} ka zikr kiya. Phir \${evidence} ne purani afwaah ko serious bana diya.",
        "Local logon ki baaton me \${detail} baar baar repeat hua. Isi se \${evidence} ka connection nikla."
      ],
      escalation: [
        "\${escalation2}. Phir \${escalation3}. Ab gaon ki afwaah ek serious mystery ban gayi.",
        "\${escalation2}. Baad me \${escalation3}. Jitna log chup rahe, utni kahani gehri hoti gayi.",
        "\${escalation2}. Aur jab \${escalation3}, tab local kahani me hidden sach dikhne laga."
      ],
      twist: [
        "Jab local kahaniyan compare hui, to \${twist} ka link saamne aaya. Isi ne poore gaon ke raaz ko naya angle diya.",
        "Aakhri clue ne \${twist} ka connection dikhaya. Tab samajh aaya ki darr ke peeche sirf afwaah nahi thi.",
        "Sab baatein jodne par \${twist} ka role clear hua. Yahin se gaon ki kahani palat gayi."
      ]
    },

    money_lesson_case: {
      setup: [
        "Shuruaat ek normal financial decision se hui. \${location} me sab kuch practical lag raha tha, lekin risk quietly build ho raha tha.",
        "Pehli nazar me deal simple thi. \${location} ke context me ye decision safe lag raha tha, par numbers ke andar ek hidden risk tha.",
        "Financial story \${location} se start hui. Bahar se profit dikh raha tha, lekin andar ek \${atmosphere} warning chhupi thi."
      ],
      conflict: [
        "Numbers theek lag rahe the, lekin \${tension} hidden tha. \${escalation1}. Yahin se decision risky ban gaya.",
        "Problem tab aayi jab expected profit aur actual risk match nahi hua. \${escalation1}. Financial gap badhta gaya.",
        "\${tension} ka impact pehle clear nahi tha. \${escalation1}. Baad me wahi sabse mehngi mistake banne laga."
      ],
      clue: [
        "Transaction details dekhne par \${detail} se judi asli problem saamne aayi. Uske baad \${evidence} ignore nahi kiya ja sakta tha.",
        "Jab numbers dobara check hue, to \${detail} ka issue dikha. Phir \${evidence} ne risk ko confirm kar diya.",
        "Financial trail me \${detail} ka link mila. Isi link ne \${evidence} ko main warning sign bana diya."
      ],
      escalation: [
        "\${escalation2}. Phir \${escalation3}. Ab profit wali story loss lesson me badalne lagi.",
        "\${escalation2}. Baad me \${escalation3}. Jitna delay hua, utna risk expensive hota gaya.",
        "\${escalation2}. Aur jab \${escalation3}, tab actual damage samne aane laga."
      ],
      twist: [
        "Jab sab numbers connect hue, to \${twist} ka hidden link nikla. Isi ne poori financial story ka result badal diya.",
        "Final calculation me \${twist} saamne aaya. Tab samajh aaya ki profit ka signal actually warning tha.",
        "Risk analysis complete hua to \${twist} ne poora angle palat diya. Yahin se asli lesson clear hua."
      ]
    },

    general_story: {
      setup: [
        "Shuruaat \${location} se hoti hai, jahan sab kuch normal lag raha tha. Lekin mahaul me ek \${atmosphere} feeling dheere dheere banne lagi."
      ],
      conflict: [
        "Phir \${tension} ka angle saamne aaya. \${escalation1}. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi."
      ],
      clue: [
        "Isi beech \${detail} se judi ek chhoti si information mili. Uske baad \${evidence} par sabki nazar gayi."
      ],
      escalation: [
        "\${escalation2}. Phir \${escalation3}. Yahin se kahani simple incident se serious mystery banne lagi."
      ],
      twist: [
        "Jab ye sab details connect hui, to \${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya."
      ]
    }
  };

  const selected = scenePools[archetype] || scenePools.general_story;
  const seed = [
    context.topic,
    archetype,
    context.location_context,
    context.central_tension,
    context.trigger_detail,
    context.evidence_object
  ].join("|");

  return {
    setup: pickSeeded(selected.setup, seed + "|setup"),
    conflict: pickSeeded(selected.conflict, seed + "|conflict"),
    clue: pickSeeded(selected.clue, seed + "|clue"),
    escalation: pickSeeded(selected.escalation, seed + "|escalation"),
    twist: pickSeeded(selected.twist, seed + "|twist")
  };
}

`;

code = code.replace(insertBefore, sceneEngine + insertBefore);

const oldReturn = `  return {
    hook: buildHookFormula(context, topic),
    setup: \`Shuruaat \${location} se hoti hai, jahan sab kuch normal lag raha tha. Lekin mahaul me ek \${atmosphere} feeling dheere dheere banne lagi.\`,
    conflict: \`Phir \${tension} ka angle saamne aaya. \${escalation1}. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi.\`,
    clue: \`Isi beech \${detail} se judi ek chhoti si information mili. Uske baad \${evidence} par sabki nazar gayi.\`,
    escalation: \`\${escalation2}. Phir \${escalation3}. Yahin se kahani simple incident se serious mystery banne lagi.\`,
    twist: \`Jab ye sab details connect hui, to \${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya.\`,
    lesson: \`\${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.\`
  };`;

const newReturn = `  const sceneTemplates = buildSceneTemplates(context);
  const sceneValues = {
    topic,
    location,
    tension,
    detail,
    evidence,
    escalation1,
    escalation2,
    escalation3,
    twist,
    atmosphere
  };

  return {
    hook: buildHookFormula(context, topic),
    setup: applySceneTemplate(sceneTemplates.setup, sceneValues),
    conflict: applySceneTemplate(sceneTemplates.conflict, sceneValues),
    clue: applySceneTemplate(sceneTemplates.clue, sceneValues),
    escalation: applySceneTemplate(sceneTemplates.escalation, sceneValues),
    twist: applySceneTemplate(sceneTemplates.twist, sceneValues),
    lesson: \`\${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.\`
  };`;

if (!code.includes(oldReturn)) {
  throw new Error("Expected return block not found. Manual audit needed.");
}

code = code.replace(oldReturn, newReturn);

fs.writeFileSync(realizerPath, code);
console.log("Phase 24.18 Archetype Scene Language Engine applied.");
