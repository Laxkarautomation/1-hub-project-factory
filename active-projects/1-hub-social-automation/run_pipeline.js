const { runAdminRuntimePreflight } = require("./modules/pipeline/preflight/admin_runtime_preflight");
const fs = require("fs");
const path = require("path");
const { dispatchJob } = require("./modules/jobs/core/job_dispatcher");

const stateDir = path.join(process.cwd(), "storage/pipeline");
const statePath = path.join(stateDir, "pipeline_state.json");
const reportPath = path.join(stateDir, "pipeline_report.json");

fs.mkdirSync(stateDir, { recursive: true });

const args = process.argv.slice(2);
const shouldResume = args.includes("--resume");
const shouldForce = args.includes("--force");

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let state = shouldResume
  ? loadJson(statePath, { completedSteps: [] })
  : { completedSteps: [] };

const report = {
  started_at: new Date().toISOString(),
  mode: shouldResume ? "resume" : shouldForce ? "force" : "fresh",
  execution_layer: "job_dispatcher",
  steps: []
};

async function runStep(step) {
  const alreadyDone = state.completedSteps.includes(step.id);

  if (alreadyDone && shouldResume && !shouldForce) {
    console.log(`⏭️  Skipping completed step: ${step.name}`);
    report.steps.push({
      id: step.id,
      name: step.name,
      status: "skipped",
      reason: "already_completed"
    });
    return;
  }

  try {
    const result = await dispatchJob(
      {
        id: step.id,
        name: step.name,
        type: "pipeline_step",
        command: step.command
      },
      {
        writeResult: true,
        throwOnFailure: true
      }
    );

    if (!state.completedSteps.includes(step.id)) {
      state.completedSteps.push(step.id);
    }

    saveJson(statePath, state);

    report.steps.push({
      id: step.id,
      name: step.name,
      command: step.command,
      status: result.status,
      duration_ms: result.duration_ms,
      execution_layer: "job_dispatcher"
    });

    saveJson(reportPath, report);
  } catch (error) {
    const result = error.result || {};

    report.steps.push({
      id: step.id,
      name: step.name,
      command: step.command,
      status: "failed",
      duration_ms: result.duration_ms || null,
      error: result.error || error.message,
      execution_layer: "job_dispatcher"
    });

    report.failed_at = step.id;
    report.finished_at = new Date().toISOString();

    saveJson(reportPath, report);

    console.error(`\n❌ Pipeline failed at: ${step.name}`);
    console.error(`Report: ${reportPath}`);
    console.error(`Resume with: node run_pipeline.js --resume`);

    process.exit(1);
  }
}

function getScriptIdsFromManifest() {
  const manifestPath = path.join(process.cwd(), "modules/video/output/video_manifest.json");

  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  return manifest.map(item => item.script_id).filter(Boolean);
}

const baseSteps = [
  {
    id: "provider_health_check",
    name: "Provider Health Check",
    command: "node modules/providers/run_provider_health_check.js"
  },
  {
    id: "provider_summary",
    name: "Provider Summary",
    command: "node modules/providers/run_provider_summary.js"
  },
  {
    id: "provider_execution_preflight",
    name: "Provider Execution Preflight",
    command: "node modules/providers/run_provider_execution_preflight.js"
  },
  {
    id: "collect_youtube",
    name: "Collect Competitor YouTube Data",
    command: "node providers/youtube/services/collect_multi_channels.js"
  },
  {
    id: "normalize_youtube",
    name: "Normalize YouTube Data",
    command: "node providers/youtube/services/normalize_all_youtube.js"
  },
  {
    id: "filter_relevant_videos",
    name: "Filter Relevant Videos",
    command: "node modules/analytics/services/filter_relevant_videos.js"
  },
  {
    id: "create_top_ideas_input",
    name: "Create Top Ideas Input",
    command: "node modules/analytics/services/create_top_ideas_input.js"
  },
  {
    id: "extract_story_angles",
    name: "Extract Story Angles",
    command: "node modules/analytics/services/extract_story_angles.js"
  },
  {
    id: "extract_research_notes",
    name: "Extract Research Notes",
    command: "node modules/research/services/extract_research_notes.js"
  },
  {
    id: "generate_research_scripts",
    name: "Generate Research Scripts",
    command: "node modules/scripts/services/generate_research_scripts.js"
  },
  {
    id: "generate_image_prompts",
    name: "Generate Scene Varied Image Prompts",
    command: "node modules/images/services/generate_scene_varied_prompts.js"
  },
  {
    id: "generate_captions",
    name: "Generate Captions",
    command: "node modules/captions/services/generate_captions.js"
  },
  {
    id: "generate_voice",
    name: "Generate Audio Voice",
    command: "node providers/edge-tts/services/generate_voice.js"
  },
  {
    id: "export_content_pack",
    name: "Export Content Pack",
    command: "node modules/publishing/services/export_content_pack.js"
  },
  {
    id: "build_video_manifest",
    name: "Build Video Manifest",
    command: "node modules/video/services/build_video_manifest.js"
  },
  {
    id: "build_shot_list",
    name: "Build Shot List",
    command: "node modules/video/services/build_shot_list.js"
  },
  {
    id: "export_image_jobs",
    name: "Export Image Jobs",
    command: "node providers/image-providers/services/export_image_jobs.js"
  }
];


function runPhase11AdminPreflightGate() {
  const preflight = runAdminRuntimePreflight();

  console.log(JSON.stringify({
    phase: "11-admin-runtime-pipeline-preflight",
    success: preflight.success,
    activeChannelId: preflight.activeChannelId,
    errors: preflight.errors,
    warnings: preflight.warnings
  }, null, 2));

  if (!preflight.success) {
    throw new Error("Admin runtime preflight failed. Fix admin/channel/provider config before pipeline run.");
  }

  return preflight;
}

runPhase11AdminPreflightGate();

async function main() {
  console.log("\n🚀 1 Hub Social Automation — Master Pipeline Started");

  for (const step of baseSteps) {
    await runStep(step);
  }

  const scriptIds = getScriptIdsFromManifest();

  if (!scriptIds.length) {
    console.warn("⚠️ No script IDs found in video manifest. Skipping image factory and render steps.");
  } else {
    for (const scriptId of scriptIds) {
      await runStep({
        id: `image_factory_${scriptId}`,
        name: `Image Factory: ${scriptId}`,
        command: `node modules/image-factory/run_image_factory.js ${scriptId}`
      });

      await runStep({
        id: `image_audit_${scriptId}`,
        name: `Image Audit: ${scriptId}`,
        command: `node modules/image-factory/run_image_audit.js ${scriptId}`
      });
    }

    await runStep({
      id: "batch_video_render",
      name: "Batch Video Render",
      command: "node modules/video-renderer/services/render_all_videos.js"
    });
  }

  report.finished_at = new Date().toISOString();
  report.status = "success";

  saveJson(reportPath, report);

  console.log("\n✅ Master pipeline completed successfully");
  console.log(`State: ${statePath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
