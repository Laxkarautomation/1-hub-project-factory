const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const intelligenceScriptsPath = path.join(__dirname, "../../../modules/intelligence/output/generated_unraaz_scripts.json");
const researchScriptsPath = path.join(__dirname, "../../../modules/scripts/output/unraaz_research_scripts.json");
const outputDir = path.join(__dirname, "../../../storage/audio/unraaz");

fs.mkdirSync(outputDir, { recursive: true });

function loadScripts() {
  if (fs.existsSync(intelligenceScriptsPath)) {
    const report = JSON.parse(fs.readFileSync(intelligenceScriptsPath, "utf-8"));
    return Array.isArray(report) ? report : (report.scripts || report.items || []);
  }

  return JSON.parse(fs.readFileSync(researchScriptsPath, "utf-8"));
}

function scriptToText(script) {
  return (script.script || [])
    .map(line => line.text || line.narration || "")
    .filter(Boolean)
    .join(" ");
}

function run() {
  const scripts = loadScripts();

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
