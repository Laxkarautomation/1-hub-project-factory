require("dotenv").config();

const fs = require("fs");
const path = require("path");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY missing in .env");
  process.exit(1);
}

const promptPath = path.join(__dirname, "../prompts/idea_analysis.md");
const clustersPath = path.join(__dirname, "../../../storage/exports/normalized/topic_clusters.json");
const topInputPath = path.join(__dirname, "../../../storage/ideas/top_ideas_input.json");
const outputPath = path.join(__dirname, "../../../storage/ideas/gemini_generated_ideas.json");

async function run() {
  const prompt = fs.readFileSync(promptPath, "utf-8");
  const clusters = fs.readFileSync(clustersPath, "utf-8");
  const topInput = fs.readFileSync(topInputPath, "utf-8");

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${prompt}

TOPIC CLUSTERS:
${clusters}

TOP COMPETITOR INPUT:
${topInput}`
          }
        ]
      }
    ]
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Gemini API failed:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  fs.writeFileSync(outputPath, text);

  console.log("✅ Gemini ideas generated:");
  console.log(outputPath);
}

run();
