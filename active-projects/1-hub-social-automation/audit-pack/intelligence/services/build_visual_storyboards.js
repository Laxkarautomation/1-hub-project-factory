const fs = require("fs");
const path = require("path");

const { buildVisualContext } = require("../core/visual_context_builder");
const { buildStoryboard } = require("../core/storyboard_intelligence");
const { resolveChannelRuntime } = require("../../channels/channel_runtime_resolver");

const inputPath = path.join(process.cwd(), "modules/intelligence/output/script_briefs.json");
const outputPath = path.join(process.cwd(), "modules/intelligence/output/visual_storyboards.json");

function toArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function hasDocumentarySceneBeats(brief = {}) {
  return toArray(brief.documentary_script?.scene_beats).length > 0;
}

function resolveDefaultChannel() {
  const runtime = resolveChannelRuntime();
  return runtime.success ? runtime.channel : {};
}

function buildContractFields(channel = {}, expectedStoryboards = 0, generatedStoryboards = 0, failureReason = null) {
  return {
    success: !failureReason,
    workflowRunId: process.env.WORKFLOW_RUN_ID || null,
    channelId: channel.channelId || "active_channel",
    failureReason,
    expectedStoryboards,
    generatedStoryboards
  };
}

function resolveFailureReason(expectedStoryboards, generatedStoryboards, skippedBriefs = []) {
  if (generatedStoryboards > 0) return null;
  if (expectedStoryboards === 0) return "missing_storyboard_source";
  if (skippedBriefs.some(brief => brief.reason === "missing_documentary_scene_beats")) {
    return "missing_scene_beats";
  }
  return "visual_pipeline_contract_failed";
}

function buildVisualStoryboards(briefs = [], options = {}) {
  const channel = options.channel || resolveDefaultChannel();
  const storyboards = [];
  const skippedBriefs = [];
  const inputBriefs = toArray(briefs);

  inputBriefs.forEach((brief, index) => {
    if (!hasDocumentarySceneBeats(brief)) {
      skippedBriefs.push({
        index,
        topic: brief.topic || "",
        reason: "missing_documentary_scene_beats"
      });
      return;
    }

    const visualContext = buildVisualContext(brief, { channel });
    storyboards.push(buildStoryboard(brief, visualContext));
  });

  const failureReason = resolveFailureReason(inputBriefs.length, storyboards.length, skippedBriefs);

  return {
    version: "phase_27a_visual_storyboards",
    status: failureReason ? "visual_pipeline_contract_failed" : "visual_storyboards_ready",
    generated_at: new Date().toISOString(),
    ...buildContractFields(channel, inputBriefs.length, storyboards.length, failureReason),
    total_input_briefs: inputBriefs.length,
    total_storyboards: storyboards.length,
    skipped_briefs: skippedBriefs,
    storyboards
  };
}

function loadBriefs(filePath = inputPath) {
  const report = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return toArray(report.briefs || report.items || report);
}

function run() {
  if (!fs.existsSync(inputPath)) {
    console.error("Script briefs missing:", inputPath);
    process.exit(1);
  }

  const report = buildVisualStoryboards(loadBriefs(inputPath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("Visual storyboards generated");
  console.log(outputPath);
  console.log(`Total storyboards: ${report.total_storyboards}`);
  console.log(`Skipped briefs: ${report.skipped_briefs.length}`);

  if (!report.success) {
    console.error(JSON.stringify({
      status: report.status,
      workflowRunId: report.workflowRunId,
      channelId: report.channelId,
      failureReason: report.failureReason,
      expectedStoryboards: report.expectedStoryboards,
      generatedStoryboards: report.generatedStoryboards
    }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  buildVisualStoryboards,
  loadBriefs,
  hasDocumentarySceneBeats
};
