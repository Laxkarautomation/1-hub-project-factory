const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");

function safeReadJson(relativePath, fallback = null) {
  const fullPath = path.join(ROOT, relativePath);

  try {
    if (!fs.existsSync(fullPath)) return fallback;
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (err) {
    return {
      error: true,
      path: relativePath,
      message: err.message
    };
  }
}

function listFiles(relativeDir) {
  const fullDir = path.join(ROOT, relativeDir);

  try {
    if (!fs.existsSync(fullDir)) return [];
    return fs.readdirSync(fullDir).map((name) => path.join(relativeDir, name));
  } catch {
    return [];
  }
}

function getDashboardSnapshot() {
  return {
    success: true,
    generatedAt: new Date().toISOString(),

    channels: {
      active: safeReadJson("modules/channels/storage/active_channel.json", {}),
      registry: safeReadJson("modules/channels/storage/channels.json", {})
    },

    providers: {
      config: safeReadJson("modules/providers/config/generation_providers.json", {}),
      keys: safeReadJson("modules/providers/storage/provider_keys.json", {}),
      health: safeReadJson("modules/providers/output/provider_health_status.json", {}),
      summary: safeReadJson("modules/providers/output/provider_summary.json", {}),
      dashboard: safeReadJson("modules/providers/output/provider_dashboard_data.json", {})
    },

    jobs: {
      queue: safeReadJson("storage/jobs/job_queue.json", {}),
      history: safeReadJson("storage/jobs/job_history.json", {})
    },

    workflow: {
      latest: safeReadJson("storage/reports/content-workflow/latest_workflow_report.json", {}),
      config: safeReadJson("storage/workflows/default_content_workflow_unraaz.json", {}),
      reports: listFiles("storage/reports/content-workflow")
    },

    pipeline: {
      report: safeReadJson("storage/pipeline/pipeline_report.json", {})
    },

    video: {
      batchRenderReport: safeReadJson("modules/video-renderer/output/batch_render_report.json", {})
    }
  };
}

module.exports = {
  ROOT,
  safeReadJson,
  listFiles,
  getDashboardSnapshot
};
