const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../../storage/ideas/generated_ideas.json"
);

const outputPath = path.join(
  __dirname,
  "../../../storage/scripts/generated_scripts.json"
);

function createScript(idea, index) {
  return {
    script_id: `script_${String(index + 1).padStart(3, "0")}`,
    source_content_id: idea.source_content_id,
    idea_title: idea.idea_title,
    hook: idea.hook,
    duration_seconds: 35,
    language: "hinglish",
    script: [
      idea.hook,
      "India me kuch jagah aisi hain jinke baare me log kam baat karte hain.",
      "Lekin un jagahon ke peeche ki kahani kabhi kabhi bahut dark hoti hai.",
      "Aaj ki story me hum dekhenge ek aisi mystery jahan sach aur afwah ke beech line dhundhli ho jati hai.",
      "Aur end me aap decide karna — ye sirf kahani thi ya kuch aur?"
    ],
    status: "draft"
  };
}

function run() {
  const ideas = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const scripts = ideas.map(createScript);

  fs.writeFileSync(outputPath, JSON.stringify(scripts, null, 2));

  console.log("✅ Scripts generated:");
  console.log(outputPath);
}

run();
