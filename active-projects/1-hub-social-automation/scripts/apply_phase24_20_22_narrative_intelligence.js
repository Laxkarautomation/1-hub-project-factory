const fs = require("fs");

const contextPath = "modules/intelligence/core/story_context_builder.js";
const realizerPath = "modules/intelligence/core/story_realizer.js";

let contextCode = fs.readFileSync(contextPath, "utf8");
let realizerCode = fs.readFileSync(realizerPath, "utf8");

if (contextCode.includes("function buildNarrativeSignals") || realizerCode.includes("function buildCallbackFormula")) {
  console.log("Phase 24.20-24.22 already applied.");
  process.exit(0);
}

/**
 * Patch 1: Story Context Builder
 * Adds:
 * - display_topic
 * - open_loop
 * - callback_line
 */

const insertContextBefore = `function buildStoryContext(topic = "", channel = {}) {`;

const narrativeSignalEngine = `function displayTopicForArchetype(topic = "", archetype = "general_story") {
  const cleanTopic = cleanText(topic).replace(/_/g, " ").replace(/\\s+/g, " ");
  const fallback = cleanTopic || "ye kahani";

  const displayMap = {
    historical_mystery: "ye historical mystery",
    true_crime_case: "ye case",
    village_mystery: "ye gaon ki kahani",
    money_lesson_case: "ye financial case",
    general_story: fallback
  };

  return displayMap[archetype] || fallback;
}

function buildNarrativeSignals(topic = "", archetypeVocabulary = {}, vocabulary = {}) {
  const archetype = archetypeVocabulary.archetypeId || "general_story";
  const trigger = archetypeVocabulary.trigger || vocabulary.secondary || "ek chhoti detail";
  const evidence = archetypeVocabulary.evidence || vocabulary.tertiary || "ek purana record";
  const tension = archetypeVocabulary.tension || vocabulary.tension || "ek ajeeb problem";
  const twist = archetypeVocabulary.twist || vocabulary.twist || "ek purana connection";

  const pools = {
    historical_mystery: {
      openLoop: [
        "\${evidence} me ek aisi entry thi jiska matlab turant samajh nahi aaya",
        "\${trigger} pehle normal laga, lekin wahi sabse bada signal nikla",
        "\${tension} ka jawab purane records me chhupa tha",
        "ek purani line ne poori history par sawal khada kar diya"
      ],
      callback: [
        "Aur wahi purani entry aakhir me poori mystery ka center ban gayi.",
        "Jo record pehle ordinary lag raha tha, wahi sabse bada clue nikla.",
        "Jis detail ko ignore kiya gaya tha, usne history ka angle palat diya.",
        "Aakhir me samajh aaya ki purane records kabhi bina wajah repeat nahi hote."
      ]
    },

    true_crime_case: {
      openLoop: [
        "\${trigger} investigation ki sabse ignored detail thi",
        "\${evidence} normal evidence lag raha tha, lekin usme ek hidden gap tha",
        "\${tension} ka jawab case file ke ek chhote point me chhupa tha",
        "ek statement poori timeline se match nahi kar raha tha"
      ],
      callback: [
        "Aur wahi ignored detail aakhir me poori investigation ka direction badal gayi.",
        "Jo evidence normal lag raha tha, wahi case ka turning point nikla.",
        "Jis gap ko chhota maana gaya, wahi sabse bada clue ban gaya.",
        "Aakhir me case wahi se khula jise sabne pehle ignore kiya tha."
      ]
    },

    village_mystery: {
      openLoop: [
        "\${trigger} ke baare me gaon wale khulkar baat nahi karte the",
        "\${evidence} ko lekar local logon ki khamoshi sabse ajeeb thi",
        "\${tension} ka darr gaon me saalon se bana hua tha",
        "gaon ki ek purani baat har kahani me repeat ho rahi thi"
      ],
      callback: [
        "Aur wahi khamoshi aakhir me sabse bada clue ban gayi.",
        "Jo baat gaon wale bol nahi rahe the, wahi poori mystery ka answer nikli.",
        "Jis jagah se log door rehte the, wahi kahani ka asli center nikli.",
        "Aakhir me gaon ki purani afwaah sirf afwaah nahi lagi."
      ]
    },

    money_lesson_case: {
      openLoop: [
        "\${trigger} financial decision ka sabse ignored risk tha",
        "\${evidence} me warning clear thi, lekin use profit samajh liya gaya",
        "\${tension} numbers ke andar chhupa hua tha",
        "ek chhoti calculation ne poori financial story palat di"
      ],
      callback: [
        "Aur wahi ignored risk aakhir me sabse mehngi galti ban gaya.",
        "Jo profit lag raha tha, wahi actual warning nikla.",
        "Jis number ko chhota samjha gaya, usne poora result badal diya.",
        "Aakhir me financial story wahi se palti jahan risk ignore hua tha."
      ]
    },

    general_story: {
      openLoop: [
        "\${trigger} pehle normal laga, lekin wahi sabse important detail thi",
        "\${evidence} ne kahani me ek hidden gap dikha diya",
        "\${tension} ka jawab ek chhoti si detail me chhupa tha",
        "ek ignored clue ne poori story ka angle badal diya"
      ],
      callback: [
        "Aur wahi chhoti detail aakhir me sabse bada clue ban gayi.",
        "Jo baat pehle normal lag rahi thi, wahi kahani ka turning point nikli.",
        "Aakhir me wahi ignored clue poori story ka answer ban gaya.",
        "Jis detail ko side me rakha gaya tha, wahi sab kuch connect kar gayi."
      ]
    }
  };

  const selected = pools[archetype] || pools.general_story;
  const seed = [topic, archetype, trigger, evidence, tension, twist].join("|narrative|");

  const values = { trigger, evidence, tension, twist };

  function apply(template = "") {
    return String(template || "").replace(/\\$\\{([a-zA-Z0-9_]+)\\}/g, (_, key) => values[key] || "");
  }

  return {
    display_topic: displayTopicForArchetype(topic, archetype),
    open_loop: apply(pickSeeded(selected.openLoop, seed, 13, selected.openLoop[0])),
    callback_line: apply(pickSeeded(selected.callback, seed, 29, selected.callback[0]))
  };
}

`;

contextCode = contextCode.replace(insertContextBefore, narrativeSignalEngine + insertContextBefore);

const oldContextReturn = `  return {
    topic: cleanTopic,
    mode,
    category: primaryCategory,
    atmosphere: hookStyles.includes("shock")
      ? "unexpected tension"
      : hookStyles.includes("curiosity")
        ? "slow suspense"
        : "serious focus",
    archetype: archetypeVocabulary.archetypeId,
    location_context: archetypeVocabulary.location || vocabulary.primary,
    central_tension: archetypeVocabulary.tension || vocabulary.tension,
    trigger_detail: archetypeVocabulary.trigger || vocabulary.secondary,
    evidence_object: archetypeVocabulary.evidence || vocabulary.tertiary,
    escalation_stage_1: escalationStages.escalation_stage_1,
    escalation_stage_2: escalationStages.escalation_stage_2,
    escalation_stage_3: escalationStages.escalation_stage_3,
    twist_source: archetypeVocabulary.twist || vocabulary.twist,
    audience_context: channel.targetAudience || "general audience",
    visual_style: channel.visualStyle || "",
    vocabulary,
    archetype_vocabulary: archetypeVocabulary
  };`;

const newContextReturn = `  const narrativeSignals = buildNarrativeSignals(cleanTopic, archetypeVocabulary, vocabulary);

  return {
    topic: cleanTopic,
    display_topic: narrativeSignals.display_topic,
    mode,
    category: primaryCategory,
    atmosphere: hookStyles.includes("shock")
      ? "unexpected tension"
      : hookStyles.includes("curiosity")
        ? "slow suspense"
        : "serious focus",
    archetype: archetypeVocabulary.archetypeId,
    location_context: archetypeVocabulary.location || vocabulary.primary,
    central_tension: archetypeVocabulary.tension || vocabulary.tension,
    trigger_detail: archetypeVocabulary.trigger || vocabulary.secondary,
    evidence_object: archetypeVocabulary.evidence || vocabulary.tertiary,
    escalation_stage_1: escalationStages.escalation_stage_1,
    escalation_stage_2: escalationStages.escalation_stage_2,
    escalation_stage_3: escalationStages.escalation_stage_3,
    twist_source: archetypeVocabulary.twist || vocabulary.twist,
    open_loop: narrativeSignals.open_loop,
    callback_line: narrativeSignals.callback_line,
    audience_context: channel.targetAudience || "general audience",
    visual_style: channel.visualStyle || "",
    vocabulary,
    archetype_vocabulary: archetypeVocabulary
  };`;

if (!contextCode.includes(oldContextReturn)) {
  throw new Error("Expected story context return block not found.");
}

contextCode = contextCode.replace(oldContextReturn, newContextReturn);

/**
 * Patch 2: Story Realizer
 * Adds:
 * - natural topic display
 * - open loop in hook
 * - callback block
 * - ending uses display_topic instead of raw topic
 */

const insertRealizerBefore = `function buildEndingFormula(context = {}, topic = "") {`;

const callbackFormulaEngine = `function buildCallbackFormula(context = {}) {
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

`;

realizerCode = realizerCode.replace(insertRealizerBefore, callbackFormulaEngine + insertRealizerBefore);

realizerCode = realizerCode.replace(
  `function buildEndingFormula(context = {}, topic = "") {`,
  `function buildEndingFormula(context = {}, topic = "") {`
);

const oldEndingSeedLine = `  const selectedPool = endingPools[archetype] || endingPools.general_story;
  const seed = [topic, archetype, tension, evidence, twist].join("|ending|");
  return pickSeeded(selectedPool, seed).replace(/\\$\\{topic\\}/g, topic);
}`;

const newEndingSeedLine = `  const selectedPool = endingPools[archetype] || endingPools.general_story;
  const displayTopic = clean(context.display_topic || topic || "ye kahani");
  const seed = [displayTopic, archetype, tension, evidence, twist].join("|ending|");
  return pickSeeded(selectedPool, seed).replace(/\\$\\{topic\\}/g, displayTopic);
}`;

if (!realizerCode.includes(oldEndingSeedLine)) {
  throw new Error("Expected ending seed block not found.");
}

realizerCode = realizerCode.replace(oldEndingSeedLine, newEndingSeedLine);

const oldTopicLine = `  const topic = topicTitle(context.topic || "story");`;
const newTopicLine = `  const topic = topicTitle(context.topic || "story");
  const displayTopic = clean(context.display_topic || topic);`;

realizerCode = realizerCode.replace(oldTopicLine, newTopicLine);

const oldSceneValues = `  const sceneValues = {
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
  };`;

const newSceneValues = `  const callbackLine = buildCallbackFormula(context);
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
  };`;

if (!realizerCode.includes(oldSceneValues)) {
  throw new Error("Expected scene values block not found.");
}

realizerCode = realizerCode.replace(oldSceneValues, newSceneValues);

const oldReturn = `  return {
    hook: buildHookFormula(context, topic),
    setup: applySceneTemplate(sceneTemplates.setup, sceneValues),
    conflict: applySceneTemplate(sceneTemplates.conflict, sceneValues),
    clue: applySceneTemplate(sceneTemplates.clue, sceneValues),
    escalation: applySceneTemplate(sceneTemplates.escalation, sceneValues),
    twist: applySceneTemplate(sceneTemplates.twist, sceneValues),
    lesson: buildEndingFormula(context, topic)
  };`;

const newReturn = `  return {
    hook: openLoop
      ? \`\${buildHookFormula(context, displayTopic)} \${openLoop}...\`
      : buildHookFormula(context, displayTopic),
    setup: applySceneTemplate(sceneTemplates.setup, sceneValues),
    conflict: applySceneTemplate(sceneTemplates.conflict, sceneValues),
    clue: applySceneTemplate(sceneTemplates.clue, sceneValues),
    escalation: applySceneTemplate(sceneTemplates.escalation, sceneValues),
    twist: applySceneTemplate(sceneTemplates.twist, sceneValues),
    callback: callbackLine,
    lesson: buildEndingFormula(context, displayTopic)
  };`;

if (!realizerCode.includes(oldReturn)) {
  throw new Error("Expected realizeStory return block not found.");
}

realizerCode = realizerCode.replace(oldReturn, newReturn);

fs.writeFileSync(contextPath, contextCode);
fs.writeFileSync(realizerPath, realizerCode);

console.log("Phase 24.20-24.22 Narrative Intelligence Engine applied.");
