const { createContentPackFromWorkflow } = require("../bridge/workflow_publishing_bridge");

const pack = createContentPackFromWorkflow({
  workflowRunId: "safe_check",
  channelId: "unraaz",
  title: "Safe Mode Test Content",
  description: "Phase 22 bridge validation",
  hashtags: ["#UNRAAZ"],
  finalVideoPath: "modules/video-renderer/output/research_script_001.mp4",
  providerTargets: ["telegram", "youtube"]
});

console.log(JSON.stringify({
  success: true,
  phase: "22.2-workflow-publishing-bridge",
  pack
}, null, 2));
