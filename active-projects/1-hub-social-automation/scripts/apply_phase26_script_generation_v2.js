const fs = require("fs");

const briefPath = "modules/intelligence/core/script_brief_builder.js";
let code = fs.readFileSync(briefPath, "utf8");

if (!code.includes('require("./script_generation_v2")')) {
  code = code.replace(
    'const { buildResearchNarrative } = require("./research_narrative_engine");',
    'const { buildResearchNarrative } = require("./research_narrative_engine");\nconst { buildThirtySecondScript } = require("./script_generation_v2");'
  );
}

if (!code.includes("const storyBlocks = realizeStory(storyContextWithNarrative);")) {
  code = code.replace(
    `    const storyContextWithNarrative = {
      ...storyContext,
      research_narrative: researchNarrative
    };

    return {`,
    `    const storyContextWithNarrative = {
      ...storyContext,
      research_narrative: researchNarrative
    };
    const storyBlocks = realizeStory(storyContextWithNarrative);
    const documentaryScript = buildThirtySecondScript(topic, {
      researchContext,
      researchNarrative,
      storyBlocks
    });

    return {`
  );
}

code = code.replace(
  /story_blocks: realizeStory\(storyContextWithNarrative\),/g,
  "story_blocks: storyBlocks,"
);

if (!code.includes("documentary_script: documentaryScript,")) {
  code = code.replace(
    "      story_blocks: storyBlocks,",
    "      story_blocks: storyBlocks,\n      documentary_script: documentaryScript,\n      narration_script: documentaryScript.narration_script,\n      scene_beats: documentaryScript.scene_beats,\n      script_quality_score: documentaryScript.quality_score,"
  );
}

code = code.replace(
  /estimated_duration_seconds: 60/g,
  "estimated_duration_seconds: documentaryScript.quality_score.estimated_duration_seconds || 30"
);

fs.writeFileSync(briefPath, code);
console.log("✅ Phase 26 Script Generation V2 wired");
