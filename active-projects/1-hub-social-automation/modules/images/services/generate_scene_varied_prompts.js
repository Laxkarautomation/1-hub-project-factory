const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../../scripts/output/unraaz_research_scripts.json");
const outputPath = path.join(__dirname, "../output/unraaz_varied_image_prompts.json");

const style = "vertical 9:16, dark cinematic realistic documentary style, moody lighting, dramatic shadows, high detail, no text, no watermark, no gore";

const sceneTemplates = {
  haunted_village: [
    "wide shot of abandoned Indian village at sunset, empty lanes, fog",
    "old villagers standing far away in shadows, worried faces, rural India",
    "dark narrow village path with broken temple bell and warning atmosphere",
    "close-up of empty doorway, moving curtain, eerie night mood",
    "lonely village road under moonlight, suspense ending frame"
  ],
  haunted_house: [
    "wide shot of old abandoned Indian mansion at night",
    "locked wooden door inside old house, dust and moonlight",
    "dark room with cracked walls and faint light from window",
    "close-up of staircase shadows and mysterious footsteps mood",
    "empty hallway fading into darkness, suspense ending frame"
  ],
  haunted_object: [
    "old room with antique object on wooden table, candle light",
    "family photo frames blurred in background, object in focus",
    "close-up of mysterious doll or object with dramatic shadows",
    "object lying alone after room is emptied, eerie silence",
    "dark table with object half-lit, final mystery mood"
  ],
  true_crime: [
    "dark investigation desk with case files and old phone",
    "evidence board with blurred photos and red strings, no readable text",
    "close-up of ringing old telephone in dim light",
    "shadow of investigator standing near file cabinet",
    "empty interrogation room with single chair, suspense ending"
  ],
  survival_disaster: [
    "wide shot of remote crash site in foggy mountains",
    "survivors' abandoned supplies near broken airplane parts, no bodies",
    "cold forest rescue scene, distant emergency light",
    "close-up of damaged aircraft metal in snow or mud",
    "lonely crash site under dark sky, survival mystery mood"
  ],
  general_mystery: [
    "shadowy figure walking on foggy road at night",
    "old newspaper clippings on table, no readable text",
    "dark room with single lamp and hidden file",
    "close-up of mysterious hand opening old box",
    "foggy empty road disappearing into darkness"
  ]
};

function run() {
  const scripts = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const output = scripts.map(script => {
    const templates = sceneTemplates[script.sub_theme] || sceneTemplates.general_mystery;

    return {
      script_id: script.script_id,
      sub_theme: script.sub_theme,
      selected_angle: script.selected_angle,
      scenes: script.script.map((line, index) => ({
        scene: index + 1,
        time: line.time,
        narration: line.text,
        image_prompt: `${templates[index] || templates[0]}, ${style}`
      })),
      status: "varied_image_prompts_ready"
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("✅ Varied image prompts generated");
  console.log(outputPath);
  console.log(`Total packs: ${output.length}`);
}

run();
