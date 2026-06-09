const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../scripts/output/unraaz_angle_scripts.json"
);

const outputPath = path.join(
  __dirname,
  "../output/unraaz_image_prompts.json"
);

function visualStyle(subTheme) {
  const styles = {
    haunted_village: "abandoned Indian village at dusk, empty narrow streets, fog, old houses, cinematic horror documentary mood",
    haunted_house: "old abandoned Indian mansion, cracked walls, locked wooden door, dim moonlight, eerie atmosphere",
    haunted_object: "old room with a mysterious antique doll/object on a wooden table, shadows, candle light, suspense mood",
    true_crime: "dark investigation room, case files, old telephone, evidence board, low light crime documentary style",
    survival_disaster: "remote crash site in mountains or forest, broken airplane parts, cold fog, survival tension, cinematic realism",
    sea_mystery: "dark sea at night, abandoned ship silhouette, fog, moonlight, mystery atmosphere",
    general_mystery: "dark cinematic mystery scene, shadowy figure, foggy background, suspense documentary look"
  };

  return styles[subTheme] || styles.general_mystery;
}

function createScenePrompt(script, line, index) {
  return {
    scene: index + 1,
    time: line.time,
    narration: line.text,
    image_prompt:
      `${visualStyle(script.sub_theme)}, vertical 9:16, realistic, cinematic lighting, high detail, dramatic shadows, no text, no watermark, no gore`
  };
}

function run() {
  const scripts = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  const output = scripts.map((script) => ({
    script_id: script.script_id,
    sub_theme: script.sub_theme,
    selected_angle: script.selected_angle,
    scenes: script.script.map((line, index) =>
      createScenePrompt(script, line, index)
    ),
    status: "image_prompts_ready"
  }));

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("✅ UNRAAZ image prompts generated:");
  console.log(outputPath);
  console.log(`Total script prompt packs: ${output.length}`);
}

run();
