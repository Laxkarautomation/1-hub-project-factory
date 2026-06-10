const fs = require("fs");
const workspaceResolver = require("./channel_workspace_resolver");

const workspace = workspaceResolver.getWorkspace("workspace_test_script");

const result = {
  success: true,
  phase: "10.5-channel-content-workspace-resolver",
  channelId: workspace.channelId,
  workspace: {
    videos: workspace.getVideosPath(),
    audio: workspace.getAudioPath(),
    audioFile: workspace.getAudioPath("test.mp3"),
    images: workspace.getImagesPath(),
    imageScene: workspace.getImagesPath("scene_1.jpg"),
    scripts: workspace.getScriptsPath(),
    scriptFile: workspace.getScriptsPath("test_script.json"),
    publishing: workspace.getPublishingPath(),
    publishingFile: workspace.getPublishingPath("test_publish.json"),
  },
};

result.success = Object.entries(result.workspace)
  .filter(([key]) => !key.endsWith("File") && key !== "imageScene")
  .every(([, value]) => fs.existsSync(value));

console.log(JSON.stringify(result, null, 2));

if (!result.success) {
  process.exit(1);
}
