const fs = require("fs");

const briefPath = "modules/intelligence/core/script_brief_builder.js";
let code = fs.readFileSync(briefPath, "utf8");

if (!code.includes('require("./script_generation_v3")')) {
  code = code.replace(
    'const { buildThirtySecondScript } = require("./script_generation_v2");',
    'const { buildThirtySecondScript } = require("./script_generation_v2");\nconst { buildDocumentaryScriptV3 } = require("./script_generation_v3");'
  );
}

if (!code.includes("const finalDocumentaryScript = buildDocumentaryScriptV3(topic")) {
  code = code.replace(
    `    const documentaryScript = buildThirtySecondScript(topic, {
      researchContext,
      researchNarrative,
      storyBlocks
    });

    return {`,
    `    const documentaryScript = buildThirtySecondScript(topic, {
      researchContext,
      researchNarrative,
      storyBlocks
    });
    const finalDocumentaryScript = buildDocumentaryScriptV3(topic, {
      researchContext,
      researchNarrative,
      storyBlocks,
      channel
    });

    return {`
  );
}

if (!code.includes("documentary_script_v2: documentaryScript,")) {
  code = code.replace(
    "      documentary_script: documentaryScript,",
    "      documentary_script_v2: documentaryScript,\n      documentary_script: finalDocumentaryScript,"
  );
}

code = code.replace(
  /narration_script: documentaryScript\.narration_script,/g,
  "narration_script: finalDocumentaryScript.narration_script,"
);

code = code.replace(
  /scene_beats: documentaryScript\.scene_beats,/g,
  "scene_beats: finalDocumentaryScript.scene_beats,"
);

code = code.replace(
  /script_quality_score: documentaryScript\.quality_score,/g,
  "script_quality_score: finalDocumentaryScript.quality_score,"
);

code = code.replace(
  /estimated_duration_seconds: documentaryScript\.quality_score\.estimated_duration_seconds \|\| 30/g,
  "estimated_duration_seconds: finalDocumentaryScript.quality_score.estimated_duration_seconds || 30"
);

fs.writeFileSync(briefPath, code);
console.log("✅ Phase 26 final script engine wired");
