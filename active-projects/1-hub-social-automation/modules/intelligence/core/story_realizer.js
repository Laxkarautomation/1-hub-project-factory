function clean(value = "") {
  return String(value || "").trim();
}

function topicTitle(topic = "") {
  return clean(topic).replace(/_/g, " ").replace(/\s+/g, " ");
}

function hashSeed(value = "") {
  return String(value || "").split("").reduce((sum, char) => {
    return sum + char.charCodeAt(0);
  }, 0);
}

function pickSeeded(options = [], seed = "") {
  const usable = options.filter(Boolean);
  if (!usable.length) return "";
  return usable[hashSeed(seed) % usable.length];
}


function cleanForNarration(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.\.+/g, ".")
    .replace(/\.\.\./g, "...")
    .trim();
}

function compactEvidence(value = "", topic = "") {
  const cleanValue = cleanForNarration(value);
  const cleanTopic = cleanForNarration(topic);

  if (!cleanValue) return "";

  return cleanValue
    .replace(cleanTopic + " me ", "")
    .replace(cleanTopic + " ka ", "")
    .replace(cleanTopic + " ke liye ", "")
    .replace(/primary timeline/gi, "timeline")
    .replace(/sabse important/gi, "important")
    .replace(/research angle/gi, "angle")
    .replace(/source context/gi, "source detail")
    .trim();
}

function researchIntroLine(context = {}, displayTopic = "") {
  if (!context.research_grounded) return "";

  const type = clean(context.research_type || "");
  const summary = clean(context.research_summary || "");

  if (type === "case_investigation") {
    return `${displayTopic} me sabse pehle timeline aur evidence gap ko dekhna padta hai.`;
  }

  if (type === "financial_case") {
    return `${displayTopic} me asli kahani numbers, risk aur timing ke beech chhupi hoti hai.`;
  }

  if (type === "historical_context") {
    return `${displayTopic} me popular story se zyada important old records aur dates ban jaate hain.`;
  }

  if (type === "local_mystery") {
    return `${displayTopic} me local claims aur proof gap story ko suspicious banate hain.`;
  }

  if (type === "fact_explainer") {
    return `${displayTopic} ko samajhne ke liye pehle common misconception todna zaroori hai.`;
  }

  if (summary) return summary;

  return "";
}

function avoidDuplicatePhrase(text = "") {
  return cleanForNarration(text)
    .replace(/ye case ye yaad dilata hai/gi, "ye case yaad dilata hai")
    .replace(/ye kahani ye yaad dilati hai/gi, "ye kahani yaad dilati hai")
    .replace(/ye story ye batati hai/gi, "ye story batati hai")
    .replace(/hume ye yaad dilata hai ki/gi, "hume yaad dilata hai ki")
    .replace(/hume ye yaad dilati hai ki/gi, "hume yaad dilati hai ki");
}

function buildHookFormula(context = {}, topic = "") {
  const archetype = clean(context.archetype || "general_story");
  const location = clean(context.location_context || "ek jagah");
  const detail = clean(context.trigger_detail || "ek chhoti detail");
  const evidence = compactEvidence(context.evidence_object || "ek purana record", topic);
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
      "${topic} me ek aisi baat chhupi thi jise pehle kisi ne seriously nahi liya...",
      "${topic} ki kahani simple lagti hai, lekin andar ek twist chhupa hai...",
      "${topic} me ek chhoti detail ne poora angle badal diya...",
      "${topic} ke peeche jo sach tha, woh pehle kisi ko samajh nahi aaya..."
    ]
  };

  const selectedPool = hookPools[archetype] || hookPools.general_story;
  return pickSeeded(selectedPool, seed).replace(/\$\{topic\}/g, topic);
}

function applySceneTemplate(template = "", values = {}) {
  return String(template || "").replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    return values[key] || "";
  });
}

function buildSceneTemplates(context = {}) {
  const archetype = clean(context.archetype || "general_story");

  const scenePools = {
    historical_mystery: {
      setup: [
        "Purane record aur local references ke mutabik, kahani ${location} se shuru hoti hai. Bahar se sab normal lagta tha, lekin background me ek ${atmosphere} layer chhupi thi.",
        "Archive me milne wali details ${location} ki taraf ishara karti hain. Pehli nazar me ye ordinary jagah lagti thi, par documents kuch aur keh rahe the.",
        "Itihas ke purane pages me ${location} ka zikr baar baar aata hai. Yahin se ek ${atmosphere} kahani dheere dheere shape lene lagi."
      ],
      conflict: [
        "Lekin documents me ${tension} ka contradiction saamne aaya. ${escalation1}. Isi mismatch ne puri kahani ko doubtful bana diya.",
        "Problem tab shuru hui jab record aur oral story match nahi hue. ${escalation1}. Jo baat simple lag rahi thi, usme gap dikhne laga.",
        "Purani file me ${tension} ka angle clear nahi tha. ${escalation1}. Yahin se doubt strong hone laga."
      ],
      clue: [
        "Investigation purane archive tak pahunchi, jahan ${detail} se judi information mili. Uske baad ${evidence} sabse important point ban gaya.",
        "Ek archived note me ${detail} ka reference mila. Phir ${evidence} ne purane version par sawal khade kar diye.",
        "Jab old records compare kiye gaye, to ${detail} ka link dikha. Isi link ne ${evidence} ko center me la diya."
      ],
      escalation: [
        "${escalation2}. Phir ${escalation3}. Ab ye sirf history nahi, ek unresolved mystery ban chuki thi.",
        "${escalation2}. Baad me ${escalation3}. Jitne clues milte gaye, utna record aur confusing hota gaya.",
        "${escalation2}. Aur jab ${escalation3}, tab purani kahani ka hidden layer saamne aane laga."
      ],
      twist: [
        "Jab sabhi records connect kiye gaye, to ${twist} se ek unexpected link nikla. Isi ne purani kahani ka asli angle badal diya.",
        "Final comparison me ${twist} ka connection mila. Yahin se samajh aaya ki original story incomplete thi.",
        "Saboot ek jagah rakhne par ${twist} ka role saamne aaya. Is twist ne poora historical angle palat diya."
      ]
    },

    true_crime_case: {
      setup: [
        "Shuruaat ${location} me ek routine investigation se hui. Sabko laga case straightforward hai, lekin atmosphere me ek ${atmosphere} pressure tha.",
        "Case ${location} se start hua, jahan initial details normal dikh rahi thi. Lekin investigation team ko jaldi hi kuch off feel hua.",
        "${location} me pehli report simple thi. Par scene ka mahaul aur statements ek ${atmosphere} direction me ja rahe the."
      ],
      conflict: [
        "Lekin ${tension} ne case ko complicated bana diya. ${escalation1}. Statement aur evidence ek dusre se match nahi kar rahe the.",
        "Problem tab aayi jab primary version me gaps mile. ${escalation1}. Jo timeline ban rahi thi, woh stable nahi thi.",
        "Investigation me ${tension} ka angle enter hua. ${escalation1}. Yahin se case simple se suspicious ban gaya."
      ],
      clue: [
        "Forensic review me ${detail} se judi ek nayi detail saamne aayi. Uske baad ${evidence} par focus shift ho gaya.",
        "Evidence check karte waqt ${detail} ka point notice hua. Phir ${evidence} ne investigation ki direction badal di.",
        "Case file me ${detail} ka ek ignored reference mila. Isi ke baad ${evidence} sabse bada clue ban gaya."
      ],
      escalation: [
        "${escalation2}. Phir ${escalation3}. Ab investigation ek naye track par chali gayi.",
        "${escalation2}. Baad me ${escalation3}. Jitna case khulta gaya, utne naye doubts badhte gaye.",
        "${escalation2}. Aur jab ${escalation3}, tab case ka asli pressure saamne aaya."
      ],
      twist: [
        "Jab clues connect hue, to ${twist} ka link nikla. Isi link ne poori investigation ka angle badal diya.",
        "Final review me ${twist} saamne aaya. Tab samajh aaya ki case ka sabse important point pehle ignore ho gaya tha.",
        "Evidence chain complete hui to ${twist} ne unexpected turn de diya. Yahin se asli story khuli."
      ]
    },

    village_mystery: {
      setup: [
        "Gaon me ye baat kaafi saalon se chal rahi thi. Kahani ${location} se judi thi, aur mahaul me ek ${atmosphere} darr mehsoos hota tha.",
        "${location} ke aas paas log aaj bhi dheere awaaz me baat karte hain. Bahar se sab normal, lekin andar ek ajeeb silence tha.",
        "Is gaon me ${location} ka naam aate hi log topic badal dete the. Yahin se ek ${atmosphere} kahani shuru hoti hai."
      ],
      conflict: [
        "Log ${tension} par khulkar baat nahi karte the. ${escalation1}. Isi silence ne matter ko aur suspicious bana diya.",
        "Problem ye thi ki har kisi ke paas kahani thi, par koi proof nahi de raha tha. ${escalation1}. Gaon ka mahaul heavy hone laga.",
        "Jab ${tension} ki baat uthti, log chup ho jaate. ${escalation1}. Yahi reaction sabse ajeeb tha."
      ],
      clue: [
        "Ek local gawah ne ${detail} se judi alag kahani batayi. Uske baad ${evidence} par sabki nazar gayi.",
        "Gaon ke ek purane aadmi ne ${detail} ka zikr kiya. Phir ${evidence} ne purani afwaah ko serious bana diya.",
        "Local logon ki baaton me ${detail} baar baar repeat hua. Isi se ${evidence} ka connection nikla."
      ],
      escalation: [
        "${escalation2}. Phir ${escalation3}. Ab gaon ki afwaah ek serious mystery ban gayi.",
        "${escalation2}. Baad me ${escalation3}. Jitna log chup rahe, utni kahani gehri hoti gayi.",
        "${escalation2}. Aur jab ${escalation3}, tab local kahani me hidden sach dikhne laga."
      ],
      twist: [
        "Jab local kahaniyan compare hui, to ${twist} ka link saamne aaya. Isi ne poore gaon ke raaz ko naya angle diya.",
        "Aakhri clue ne ${twist} ka connection dikhaya. Tab samajh aaya ki darr ke peeche sirf afwaah nahi thi.",
        "Sab baatein jodne par ${twist} ka role clear hua. Yahin se gaon ki kahani palat gayi."
      ]
    },

    money_lesson_case: {
      setup: [
        "Shuruaat ek normal financial decision se hui. ${location} me sab kuch practical lag raha tha, lekin risk quietly build ho raha tha.",
        "Pehli nazar me deal simple thi. ${location} ke context me ye decision safe lag raha tha, par numbers ke andar ek hidden risk tha.",
        "Financial story ${location} se start hui. Bahar se profit dikh raha tha, lekin andar ek ${atmosphere} warning chhupi thi."
      ],
      conflict: [
        "Numbers theek lag rahe the, lekin ${tension} hidden tha. ${escalation1}. Yahin se decision risky ban gaya.",
        "Problem tab aayi jab expected profit aur actual risk match nahi hua. ${escalation1}. Financial gap badhta gaya.",
        "${tension} ka impact pehle clear nahi tha. ${escalation1}. Baad me wahi sabse mehngi mistake banne laga."
      ],
      clue: [
        "Transaction details dekhne par ${detail} se judi asli problem saamne aayi. Uske baad ${evidence} ignore nahi kiya ja sakta tha.",
        "Jab numbers dobara check hue, to ${detail} ka issue dikha. Phir ${evidence} ne risk ko confirm kar diya.",
        "Financial trail me ${detail} ka link mila. Isi link ne ${evidence} ko main warning sign bana diya."
      ],
      escalation: [
        "${escalation2}. Phir ${escalation3}. Ab profit wali story loss lesson me badalne lagi.",
        "${escalation2}. Baad me ${escalation3}. Jitna delay hua, utna risk expensive hota gaya.",
        "${escalation2}. Aur jab ${escalation3}, tab actual damage samne aane laga."
      ],
      twist: [
        "Jab sab numbers connect hue, to ${twist} ka hidden link nikla. Isi ne poori financial story ka result badal diya.",
        "Final calculation me ${twist} saamne aaya. Tab samajh aaya ki profit ka signal actually warning tha.",
        "Risk analysis complete hua to ${twist} ne poora angle palat diya. Yahin se asli lesson clear hua."
      ]
    },

    general_story: {
      setup: [
        "Shuruaat ${location} se hoti hai, jahan sab kuch normal lag raha tha. Lekin mahaul me ek ${atmosphere} feeling dheere dheere banne lagi."
      ],
      conflict: [
        "Phir ${tension} ka angle saamne aaya. ${escalation1}. Logon ko laga ye bas ek normal baat hai, lekin details match nahi ho rahi thi."
      ],
      clue: [
        "Isi beech ${detail} se judi ek chhoti si information mili. Uske baad ${evidence} par sabki nazar gayi."
      ],
      escalation: [
        "${escalation2}. Phir ${escalation3}. Yahin se kahani simple incident se serious mystery banne lagi."
      ],
      twist: [
        "Jab ye sab details connect hui, to ${twist} se ek unexpected link nikla. Yahin se poori kahani ka asli angle saamne aaya."
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

function buildCallbackFormula(context = {}) {
  const archetype = clean(context.archetype || "general_story");
  const callback = clean(context.callback_line || "");
  const openLoop = clean(context.open_loop || "");

  if (callback) return callback;

  const fallbackPools = {
    historical_mystery: [
      "Aakhir me wahi record poori mystery ka center ban gaya.",
      "Jo detail purani file me chhupi thi, wahi sabse important clue nikli."
    ],
    true_crime_case: [
      "Aakhir me wahi ignored clue poori investigation ka turning point ban gaya.",
      "Jo detail chhoti lag rahi thi, wahi case ka asli answer nikli."
    ],
    village_mystery: [
      "Aakhir me gaon ki wahi khamoshi sabse bada clue ban gayi.",
      "Jo baat log bol nahi rahe the, wahi kahani ka center nikli."
    ],
    money_lesson_case: [
      "Aakhir me wahi ignored risk sabse mehngi galti ban gaya.",
      "Jo profit lag raha tha, wahi hidden warning nikla."
    ],
    general_story: [
      "Aakhir me wahi ignored detail poori kahani ka answer ban gayi.",
      "Jo baat pehle normal lag rahi thi, wahi turning point nikli."
    ]
  };

  const selectedPool = fallbackPools[archetype] || fallbackPools.general_story;
  return pickSeeded(selectedPool, [archetype, openLoop].join("|callback|"));
}

function buildEndingFormula(context = {}, topic = "") {
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
      "${topic} hume batata hai ki history ke sabse bade raaz aksar chhoti entries me chhupe hote hain."
    ],

    true_crime_case: [
      "Investigation me sabse bada clue aksar wahi hota hai jise sab ignore kar dete hain.",
      "Har solved case ke peeche kuch unanswered questions reh jaate hain.",
      "Crime stories me sach aksar evidence se kam, ignored details se zyada milta hai.",
      "Ek chhoti si inconsistency kabhi kabhi poori investigation ka direction badal deti hai.",
      "${topic} ye yaad dilata hai ki case band ho sakta hai, par sawal kabhi kabhi zinda reh jaate hain."
    ],

    village_mystery: [
      "Har afwaah jhooth nahi hoti, lekin har kahani ke peeche ek sach zaroor chhupa hota hai.",
      "Local kahaniyan aksar un baaton ko yaad rakhti hain jo records bhool jaate hain.",
      "Gaon ke raaz aksar awaaz se nahi, logon ki khamoshi se samajh aate hain.",
      "Kabhi kabhi jis baat ka naam log nahi lete, wahi sabse bada clue hoti hai.",
      "${topic} hume batata hai ki kuch kahaniyan kagaz par nahi, logon ki yaadon me zinda rehti hain."
    ],

    money_lesson_case: [
      "Profit se pehle risk ko samajhna zaroori hota hai.",
      "Financial decisions me chhoti galtiyan sabse mehngi sabit ho sakti hain.",
      "Jahan fayda zyada clean dikhe, wahan risk ko aur dhyan se dekhna chahiye.",
      "Money decisions emotion se nahi, numbers aur risk samajh kar lene chahiye.",
      "${topic} hume yaad dilata hai ki har profit wali kahani ke peeche risk ka chapter zaroor hota hai."
    ],

    general_story: [
      "${topic} hume ye yaad dilata hai ki kabhi kabhi sabse chhoti detail hi sabse bada sach chhupa kar rakhti hai.",
      "${topic} ki kahani batati hai ki sach aksar wahi hota hai jise log pehle ignore kar dete hain.",
      "Kabhi kabhi ek chhoti detail poori kahani ka meaning badal deti hai.",
      "Har kahani me ek layer hoti hai jo tab dikhti hai jab details ko dhyan se dekha jaye."
    ]
  };

  const selectedPool = endingPools[archetype] || endingPools.general_story;
  const displayTopic = clean(context.display_topic || topic || "ye kahani");
  const seed = [displayTopic, archetype, tension, evidence, twist].join("|ending|");
  return pickSeeded(selectedPool, seed).replace(/\$\{topic\}/g, displayTopic);
}



function humanizeDocumentaryBlock(text = "", topic = "") {
  let value = String(text || "").trim();

  if (!value) return "";

  value = value
    .replace(/\bcase file\b/gi, "investigation records")
    .replace(/\btimeline gap\b/gi, "timeline me chhupa hua gap")
    .replace(/\bevidence mismatch\b/gi, "evidence aur statements ka mismatch")
    .replace(/\bfinancial records\b/gi, "financial documents")
    .replace(/\s+/g, " ")
    .trim();

  return value;
}

function buildHumanLesson(topic = "", narrative = {}) {
  const mode = narrative.narrative_mode || "";

  if (mode === "investigation_documentary") {
    return "Investigation me chhoti inconsistencies hi aksar sabse bade clues ban jaati hain.";
  }

  if (mode === "risk_breakdown") {
    return "Financial decisions me risk ko ignore karna sabse mehngi galti sabit ho sakta hai.";
  }

  if (mode === "record_based_mystery") {
    return "Purane records kabhi kabhi popular kahaniyon se zyada sach bolte hain.";
  }

  return "";
}


function splitRepeatedTwist(blocks = {}) {
  const escalation = clean(blocks.documentary_turn || "");
  const evidence = clean(blocks.documentary_evidence || "");
  const conflict = clean(blocks.documentary_conflict || "");

  if (!escalation) return "";

  if (escalation === evidence || escalation === conflict) {
    return "Jab ye details ek saath dekhi gayi, kahani ka asli angle aur clear hone laga.";
  }

  if (/ignored clue/i.test(escalation)) {
    return "Yahin se story simple incident se serious investigation me badal gayi.";
  }

  return escalation;
}

function buildPolishedHook(topic = "", narrative = {}, blocks = {}) {
  const cleanTopic = clean(topic || "ye story");
  const mode = narrative.narrative_mode || "";

  if (mode === "investigation_documentary") {
    return cleanTopic + " me ek chhota timeline gap poori investigation ka direction badal deta hai...";
  }

  if (mode === "risk_breakdown") {
    return cleanTopic + " me ek ignored risk signal sabse badi warning ban gaya...";
  }

  if (mode === "record_based_mystery") {
    return cleanTopic + " me ek old record ne popular story par sawal khada kar diya...";
  }

  return blocks.documentary_hook || cleanTopic + " me ek detail poori kahani ka angle badal deti hai...";
}

function realizeDocumentaryStory(context = {}) {
  const narrative = context.research_narrative || {};
  const blocks = narrative.documentary_blocks || {};

  if (!blocks.documentary_setup) return null;

  const customLesson = buildHumanLesson(
    context.topic || "",
    narrative
  );

  const polishedHook = buildPolishedHook(context.topic || "", narrative, blocks);
  const polishedTwist = splitRepeatedTwist(blocks);

  return {
    hook: humanizeDocumentaryBlock(polishedHook, context.topic || ""),
    setup: humanizeDocumentaryBlock(blocks.documentary_setup || "", context.topic || ""),
    conflict: humanizeDocumentaryBlock(blocks.documentary_conflict || "", context.topic || ""),
    clue: humanizeDocumentaryBlock(blocks.documentary_evidence || "", context.topic || ""),
    escalation: humanizeDocumentaryBlock(blocks.documentary_turn || "", context.topic || ""),
    twist: humanizeDocumentaryBlock(polishedTwist || blocks.documentary_turn || "", context.topic || ""),
    callback: clean(context.callback_line || "Aakhir me wahi ignored detail sabse bada clue ban gayi."),
    lesson: customLesson || avoidDuplicatePhrase(blocks.documentary_takeaway || buildEndingFormula(context, context.display_topic || context.topic || "ye kahani"))
  };
}

function realizeStory(context = {}) {
  const documentaryStory = realizeDocumentaryStory(context);
  if (documentaryStory) return documentaryStory;

  const topic = topicTitle(context.topic || "story");
  const displayTopic = clean(context.display_topic || topic);
  const location = clean(context.location_context || "ek jagah");
  const tension = clean(context.central_tension || "ek ajeeb problem");
  const detail = clean(context.trigger_detail || "ek chhoti detail");
  const evidence = clean(context.evidence_object || "ek purana record");
  const escalation1 = clean(context.escalation_stage_1 || "pehli detail ignore ho gayi");
  const escalation2 = clean(context.escalation_stage_2 || "dusri detail ne doubt badha diya");
  const escalation3 = clean(context.escalation_stage_3 || "teesri detail ne asli angle khol diya");
  const twist = clean(context.twist_source || "ek purana connection");
  const atmosphere = clean(context.atmosphere || "serious");

  const sceneTemplates = buildSceneTemplates(context);
  const callbackLine = buildCallbackFormula(context);
  const openLoop = clean(context.open_loop || "");

  const sceneValues = {
    topic,
    displayTopic,
    location,
    tension,
    detail,
    evidence,
    escalation1,
    escalation2,
    escalation3,
    twist,
    atmosphere,
    openLoop,
    callbackLine
  };

  const introLine = researchIntroLine(context, displayTopic);

  const realized = {
    hook: openLoop
      ? `${buildHookFormula(context, displayTopic)} ${openLoop}...`
      : buildHookFormula(context, displayTopic),
    setup: cleanForNarration([introLine, applySceneTemplate(sceneTemplates.setup, sceneValues)].filter(Boolean).join(" ")),
    conflict: applySceneTemplate(sceneTemplates.conflict, sceneValues),
    clue: applySceneTemplate(sceneTemplates.clue, sceneValues),
    escalation: applySceneTemplate(sceneTemplates.escalation, sceneValues),
    twist: applySceneTemplate(sceneTemplates.twist, sceneValues),
    callback: callbackLine,
    lesson: avoidDuplicatePhrase(buildEndingFormula(context, displayTopic))
  };

  return realized;
}

module.exports = {
  realizeStory
};
