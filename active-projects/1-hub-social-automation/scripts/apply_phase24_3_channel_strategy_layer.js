const fs = require("fs");

const adminServicePath = "modules/admin-platform/services/admin_channel_service.js";
const channelStorePath = "modules/channels/channel_store.js";
const runtimeResolverPath = "modules/channels/channel_runtime_resolver.js";
const adminUiPath = "modules/admin-platform/ui/app.js";

function patchFile(filePath, patcher) {
  const before = fs.readFileSync(filePath, "utf8");
  const after = patcher(before);

  if (before === after) {
    console.log(`ℹ️ No changes needed: ${filePath}`);
    return;
  }

  fs.writeFileSync(filePath, after);
  console.log(`✅ Updated: ${filePath}`);
}

patchFile(adminServicePath, (code) => {
  if (code.includes("function parseListInput")) return code;

  code = code.replace(
`function readJson(file, fallback) {`,
`function parseListInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

function readJson(file, fallback) {`
  );

  code = code.replace(
`    niche: input.niche || "",
    language: input.language || "hinglish",`,
`    niche: input.niche || "",
    contentMode: input.contentMode || "",
    contentCategories: parseListInput(input.contentCategories),
    blockedCategories: parseListInput(input.blockedCategories),
    contentPillars: parseListInput(input.contentPillars),
    topicKeywords: parseListInput(input.topicKeywords),
    blockedKeywords: parseListInput(input.blockedKeywords),
    storyFormulas: parseListInput(input.storyFormulas),
    hookStyles: parseListInput(input.hookStyles),
    visualStyle: input.visualStyle || "",
    targetAudience: input.targetAudience || "",
    language: input.language || "hinglish",`
  );

  return code;
});

patchFile(channelStorePath, (code) => {
  if (code.includes("contentMode: channel.contentMode")) return code;

  code = code.replace(
`    niche: channel.niche || null,
    language: channel.language || "hinglish",`,
`    niche: channel.niche || null,
    contentMode: channel.contentMode || null,
    contentCategories: Array.isArray(channel.contentCategories) ? channel.contentCategories : [],
    blockedCategories: Array.isArray(channel.blockedCategories) ? channel.blockedCategories : [],
    contentPillars: Array.isArray(channel.contentPillars) ? channel.contentPillars : [],
    topicKeywords: Array.isArray(channel.topicKeywords) ? channel.topicKeywords : [],
    blockedKeywords: Array.isArray(channel.blockedKeywords) ? channel.blockedKeywords : [],
    storyFormulas: Array.isArray(channel.storyFormulas) ? channel.storyFormulas : [],
    hookStyles: Array.isArray(channel.hookStyles) ? channel.hookStyles : [],
    visualStyle: channel.visualStyle || "",
    targetAudience: channel.targetAudience || "",
    language: channel.language || "hinglish",`
  );

  return code;
});

patchFile(runtimeResolverPath, (code) => {
  if (code.includes("contentMode: channel.contentMode")) return code;

  code = code.replace(
`    niche: channel.niche || null,
    language: channel.language || "hinglish",`,
`    niche: channel.niche || null,
    contentMode: channel.contentMode || null,
    contentCategories: channel.contentCategories || [],
    blockedCategories: channel.blockedCategories || [],
    contentPillars: channel.contentPillars || [],
    topicKeywords: channel.topicKeywords || [],
    blockedKeywords: channel.blockedKeywords || [],
    storyFormulas: channel.storyFormulas || [],
    hookStyles: channel.hookStyles || [],
    visualStyle: channel.visualStyle || "",
    targetAudience: channel.targetAudience || "",
    language: channel.language || "hinglish",`
  );

  return code;
});

patchFile(adminUiPath, (code) => {
  if (code.includes("channelContentMode")) return code;

  code = code.replace(
`        <p><b>Language:</b> \${channel.language || ""}</p>
        <p><b>Output:</b> \${channel.outputBasePath || ""}</p>`,
`        <p><b>Language:</b> \${channel.language || ""}</p>
        <p><b>Niche:</b> \${channel.niche || ""}</p>
        <p><b>Mode:</b> \${channel.contentMode || ""}</p>
        <p><b>Categories:</b> \${(channel.contentCategories || []).join(", ")}</p>
        <p><b>Output:</b> \${channel.outputBasePath || ""}</p>`
  );

  code = code.replace(
`        <input id="channelNiche" placeholder="Niche">
        <input id="channelLanguage" placeholder="Language">
        <input id="channelOutput" placeholder="Output base path">`,
`        <input id="channelNiche" placeholder="Niche">
        <input id="channelContentMode" placeholder="Content mode e.g. story, facts, education">
        <input id="channelContentCategories" placeholder="Content categories comma separated">
        <input id="channelBlockedCategories" placeholder="Blocked categories comma separated">
        <input id="channelContentPillars" placeholder="Content pillars comma separated">
        <input id="channelTopicKeywords" placeholder="Topic keywords comma separated">
        <input id="channelBlockedKeywords" placeholder="Blocked keywords comma separated">
        <input id="channelStoryFormulas" placeholder="Story formulas comma separated">
        <input id="channelHookStyles" placeholder="Hook styles comma separated">
        <input id="channelVisualStyle" placeholder="Visual style">
        <input id="channelTargetAudience" placeholder="Target audience">
        <input id="channelLanguage" placeholder="Language">
        <input id="channelOutput" placeholder="Output base path">`
  );

  code = code.replace(
`  document.getElementById("channelNiche").value = channel.niche || "";
  document.getElementById("channelLanguage").value = channel.language || "";`,
`  document.getElementById("channelNiche").value = channel.niche || "";
  document.getElementById("channelContentMode").value = channel.contentMode || "";
  document.getElementById("channelContentCategories").value = (channel.contentCategories || []).join(",");
  document.getElementById("channelBlockedCategories").value = (channel.blockedCategories || []).join(",");
  document.getElementById("channelContentPillars").value = (channel.contentPillars || []).join(",");
  document.getElementById("channelTopicKeywords").value = (channel.topicKeywords || []).join(",");
  document.getElementById("channelBlockedKeywords").value = (channel.blockedKeywords || []).join(",");
  document.getElementById("channelStoryFormulas").value = (channel.storyFormulas || []).join(",");
  document.getElementById("channelHookStyles").value = (channel.hookStyles || []).join(",");
  document.getElementById("channelVisualStyle").value = channel.visualStyle || "";
  document.getElementById("channelTargetAudience").value = channel.targetAudience || "";
  document.getElementById("channelLanguage").value = channel.language || "";`
  );

  code = code.replace(
`    niche: document.getElementById("channelNiche").value.trim(),
    language: document.getElementById("channelLanguage").value.trim(),`,
`    niche: document.getElementById("channelNiche").value.trim(),
    contentMode: document.getElementById("channelContentMode").value.trim(),
    contentCategories: document.getElementById("channelContentCategories").value.trim(),
    blockedCategories: document.getElementById("channelBlockedCategories").value.trim(),
    contentPillars: document.getElementById("channelContentPillars").value.trim(),
    topicKeywords: document.getElementById("channelTopicKeywords").value.trim(),
    blockedKeywords: document.getElementById("channelBlockedKeywords").value.trim(),
    storyFormulas: document.getElementById("channelStoryFormulas").value.trim(),
    hookStyles: document.getElementById("channelHookStyles").value.trim(),
    visualStyle: document.getElementById("channelVisualStyle").value.trim(),
    targetAudience: document.getElementById("channelTargetAudience").value.trim(),
    language: document.getElementById("channelLanguage").value.trim(),`
  );

  return code;
});

console.log("✅ Phase 24.3 channel strategy layer patch applied");
