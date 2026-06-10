const { runWorkflow } = require("./content_workflow_engine");

const args = process.argv.slice(2);
const resume = args.includes("--resume");

runWorkflow({
  workflowId: process.env.WORKFLOW_ID || "default_content_workflow",
  channelId: process.env.CHANNEL_ID,
  resume
});
