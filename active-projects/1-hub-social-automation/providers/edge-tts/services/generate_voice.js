const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const inputPath = path.join(__dirname, "../../../modules/scripts/output/unraaz_research_scripts.json");
const outputDir = path.join(__dirname, "../../../storage/audio/unraaz");

fs.mkdirSync(outputDir, { recursive: true });

function scriptToText(script) {
  return script.script.map(line => line.text).join(" ");
}

function run() {
  const scripts = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

  scripts.slice(0, 10).forEach(script => {
    const text = scriptToText(script);
    const outputFile = path.join(outputDir, `${script.script_id}.mp3`);

    const cmd = `edge-tts --voice hi-IN-MadhurNeural --text "${text.replace(/"/g, '\\"')}" --write-media "${outputFile}"`;

    console.log(`Generating voice: ${script.script_id}`);
    execSync(cmd, { stdio: "inherit" });

    console.log(`✅ Saved: ${outputFile}`);
  });

  console.log("✅ Voice generation complete");
}

run();
