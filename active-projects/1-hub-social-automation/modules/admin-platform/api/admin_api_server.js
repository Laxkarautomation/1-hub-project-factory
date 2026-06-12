
// PHASE_24_4_AUTONOMOUS_DECISION_API
const autonomousDecisionService = require("../services/autonomous_decision_engine_service");

// PHASE_24_3_SELF_HEALING_RETRY_API
const selfHealingRetryService = require("../services/self_healing_retry_service");

// PHASE_24_2_AUTONOMOUS_SCHEDULER_API
const autonomousSchedulerService = require("../services/autonomous_scheduler_service");

// PHASE_24_1_AUTONOMOUS_RUNTIME_API
const autonomousRuntimeService = require("../services/autonomous_factory_runtime_service");

// PHASE_23_4_FACTORY_AUDIT_API
const factoryAuditService = require("../services/factory_audit_service");

// PHASE_23_3_FACTORY_OPERATIONS_API
const factoryOperationsService = require("../services/factory_operations_service");

// PHASE_23_2_CONTENT_PACK_PREVIEW_API
const contentPackPreviewService = require("../services/content_pack_preview_service");
const http = require("http");
const fs = require("fs");
const path = require("path");

const { login, requireAuth } = require("../auth/admin_auth");
const {
  safeReadJson,
  getDashboardSnapshot
} = require("../services/admin_data_service");

const {
  listChannels,
  getChannel,
  setActiveChannel,
  saveChannel,
  getChannelRuntimePreview
} = require("../services/admin_channel_service");

const {
  getProviderDashboard,
  setActiveProvider,
  saveProviderKeys
} = require("../services/admin_provider_service");

const {
  getRuntimeState,
  updateRuntimeControls,
  pauseRuntime,
  resumeRuntime,
  assertRuntimeAllowed
} = require("../services/admin_runtime_service");

const {
  getSettings,
  saveSettings,
  updateSection,
  resetDefaults
} = require("../settings/settings_service");

const {
  getPublishingDashboard,
  enqueuePublishingJob,
  runNextPublishingJob,
  retryPublishingJob
} = require("../../publishing/services/publishing_service");

const {
  getSchedulerDashboard,
  createSchedule,
  cancelSchedule,
  runSchedulerNow
} = require("../../publishing/services/publishing_scheduler_service");

const {
  getPublishingCredentialsDashboard,
  savePublishingProviderSecrets,
  removePublishingProviderSecrets
} = require("../../publishing/services/publishing_credentials_service");

const {
  getPublishingHealthDashboard
} = require("../../publishing/monitoring/publishing_health_service");

const {
  getPublishingProviderRuntimeDashboard,
  setPublishingProviderRuntime,
  enableRealPublishing,
  disableRealPublishing
} = require("../../publishing/services/publishing_provider_runtime_service");

const {
  validateTelegramProvider,
  checkTelegramConnection
} = require("../../publishing/providers/telegram/telegram_real_publisher");

const {
  validateYouTubeCredentials,
  refreshYouTubeAccessToken,
  getYouTubeChannelStatus
} = require("../../publishing/providers/youtube/youtube_oauth_service");

const {
  validateYouTubeUploadJob,
  buildYouTubeMetadata
} = require("../../publishing/providers/youtube/youtube_upload_service");

const SETTINGS_FILE = "modules/admin-platform/storage/admin_settings.json";
const UI_DIR = path.join(__dirname, "..", "ui");

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
  });

  res.end(JSON.stringify(data, null, 2));
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.normalize(path.join(UI_DIR, requestPath));

  if (!filePath.startsWith(UI_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();

  const contentType =
    ext === ".css"
      ? "text/css"
      : ext === ".js"
        ? "text/javascript"
        : "text/html";

  res.writeHead(200, {
    "Content-Type": contentType
  });

  res.end(fs.readFileSync(filePath));
}

function withAuth(req, res, handler) {
  requireAuth(req, res, handler);
}

function createAdminServer() {
  return http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      return sendJson(res, 200, { success: true });
    }

    if (!req.url.startsWith("/api")) {
      return serveStatic(req, res);
    }

        if (req.url === "/api/admin/factory" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getFactoryDashboard());
      });
    }

    if (req.url === "/api/admin/factory/queue" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, queueFactoryRun(body));
      });
    }

    if (req.url === "/api/admin/factory/approve" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, approveFactoryRun(body.runId));
      });
    }

    if (req.url === "/api/admin/factory/cancel" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, cancelFactoryRun(body.runId));
      });
    }

    if (req.url === "/api/admin/factory/run" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, executeFactoryRun(body.runId));
      });
    }

if (req.url === "/api/auth/login" && req.method === "POST") {
      const body = await readBody(req);
      return sendJson(res, 200, login(body.username, body.password));
    }

    if (req.url === "/api/dashboard" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getDashboardSnapshot());
      });
    }

    if (req.url === "/api/settings" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          settings: safeReadJson(SETTINGS_FILE, {})
        });
      });
    }

    if (req.url === "/api/channels" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          active: safeReadJson("modules/channels/storage/active_channel.json", {}),
          registry: safeReadJson("modules/channels/storage/channels.json", {})
        });
      });
    }

    if (req.url === "/api/admin/channels" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, listChannels());
      });
    }

    if (req.url.startsWith("/api/admin/channels/") && req.method === "GET") {
      return withAuth(req, res, () => {
        const parts = req.url.split("/");
        const channelId = parts[4];
        const action = parts[5];

        if (action === "runtime") {
          return sendJson(res, 200, getChannelRuntimePreview(channelId));
        }

        return sendJson(res, 200, getChannel(channelId));
      });
    }

    if (req.url === "/api/admin/channels/save" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, saveChannel(body));
      });
    }

    if (req.url === "/api/admin/channels/set-active" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, setActiveChannel(body.channelId));
      });
    }


    if (req.url === "/api/providers" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          config: safeReadJson("modules/providers/config/generation_providers.json", {}),
          keys: safeReadJson("modules/providers/storage/provider_keys.json", {}),
          health: safeReadJson("modules/providers/output/provider_health_status.json", {}),
          summary: safeReadJson("modules/providers/output/provider_summary.json", {}),
          dashboard: safeReadJson("modules/providers/output/provider_dashboard_data.json", {})
        });
      });
    }

    if (req.url === "/api/admin/providers" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getProviderDashboard());
      });
    }

    if (req.url === "/api/admin/providers/set-active" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, setActiveProvider(body.type, body.providerId));
      });
    }

    if (req.url === "/api/admin/providers/keys" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, saveProviderKeys(body.providerId, body.keys));
      });
    }


    if (req.url === "/api/admin/runtime" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getRuntimeState());
      });
    }

    if (req.url === "/api/admin/runtime/controls" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, updateRuntimeControls(body.controls || body));
      });
    }

    if (req.url === "/api/admin/runtime/pause" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, pauseRuntime(body.reason));
      });
    }

    if (req.url === "/api/admin/runtime/resume" && req.method === "POST") {
      return withAuth(req, res, () => {
        sendJson(res, 200, resumeRuntime());
      });
    }

    if (req.url === "/api/admin/runtime/check" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, assertRuntimeAllowed(body.action));
      });
    }

    if (req.url === "/api/admin/settings" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          settings: getSettings()
        });
      });
    }

    if (req.url === "/api/admin/settings/save" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, {
          success: true,
          settings: saveSettings(body.settings || body)
        });
      });
    }

    if (req.url === "/api/admin/settings/update" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        sendJson(res, 200, {
          success: true,
          settings: updateSection(body.section, body.values || {})
        });
      });
    }







    if (req.url === "/api/admin/publishing/youtube/oauth-check" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          const providerId = body.providerId || "youtube_api";
          const live = body.live === true;

          const validation = validateYouTubeCredentials(providerId);
          const token = await refreshYouTubeAccessToken(providerId, {
            safeMode: !live
          });
          const channel = await getYouTubeChannelStatus(providerId, {
            safeMode: !live
          });

          sendJson(res, 200, {
            success: validation.success && token.success && channel.success,
            validation,
            token: {
              ...token,
              accessToken: token.accessToken ? "***masked***" : null
            },
            channel
          });
        } catch (error) {
          sendJson(res, 500, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/youtube/validate-upload" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          const job = {
            jobId: body.jobId || "admin_youtube_upload_validation",
            platform: "youtube",
            contentType: "video",
            payload: body.payload || body
          };

          sendJson(res, 200, {
            success: true,
            validation: validateYouTubeUploadJob(job),
            metadata: buildYouTubeMetadata(job)
          });
        } catch (error) {
          sendJson(res, 500, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/telegram/check" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          const providerId = body.providerId || "telegram_bot_api";
          const validation = await validateTelegramProvider(providerId);
          const connection = await checkTelegramConnection(providerId, {
            safeMode: body.live !== true
          });

          sendJson(res, 200, {
            success: validation.success && connection.success,
            validation,
            connection
          });
        } catch (error) {
          sendJson(res, 500, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/provider-runtime" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getPublishingProviderRuntimeDashboard());
      });
    }

    if (req.url === "/api/admin/publishing/provider-runtime/save" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, setPublishingProviderRuntime(
            body.platform,
            body.providerId,
            body.settings || {}
          ));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/provider-runtime/enable-real" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, enableRealPublishing(body.platform, body.providerId));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/provider-runtime/disable-real" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, disableRealPublishing(body.platform, body.providerId));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/health" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getPublishingHealthDashboard());
      });
    }

    if (req.url === "/api/admin/publishing/retry" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, retryPublishingJob(body.jobId));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/credentials" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getPublishingCredentialsDashboard());
      });
    }

    if (req.url === "/api/admin/publishing/credentials/save" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, savePublishingProviderSecrets(body));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/credentials/delete" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, removePublishingProviderSecrets(body.providerId));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/scheduler" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getSchedulerDashboard());
      });
    }

    if (req.url === "/api/admin/publishing/schedules/create" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, createSchedule(body));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/schedules/cancel" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, cancelSchedule(body.scheduleId));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/scheduler/run" && req.method === "POST") {
      return withAuth(req, res, async () => {
        try {
          const body = await readBody(req);
          sendJson(res, 200, await runSchedulerNow(body || {}));
        } catch (error) {
          sendJson(res, 500, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/settings/reset" && req.method === "POST") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          settings: resetDefaults()
        });
      });
    }

    if (req.url === "/api/admin/publishing" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, getPublishingDashboard());
      });
    }

    if (req.url === "/api/admin/publishing/enqueue" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const body = await readBody(req);
        try {
          sendJson(res, 200, enqueuePublishingJob(body));
        } catch (error) {
          sendJson(res, 400, {
            success: false,
            error: error.message
          });
        }
      });
    }

    if (req.url === "/api/admin/publishing/run-next" && req.method === "POST") {
      return withAuth(req, res, async () => {
        const result = await runNextPublishingJob();
        sendJson(res, 200, result);
      });
    }

    if (req.url === "/api/jobs" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          queue: safeReadJson("storage/jobs/job_queue.json", {}),
          history: safeReadJson("storage/jobs/job_history.json", {})
        });
      });
    }

    if (req.url === "/api/reports" && req.method === "GET") {
      return withAuth(req, res, () => {
        sendJson(res, 200, {
          success: true,
          workflow: safeReadJson("storage/reports/content-workflow/latest_workflow_report.json", {}),
          pipeline: safeReadJson("storage/pipeline/pipeline_report.json", {}),
          providerHealth: safeReadJson("modules/providers/output/provider_health_status.json", {}),
          providerSummary: safeReadJson("modules/providers/output/provider_summary.json", {}),
          batchRender: safeReadJson("modules/video-renderer/output/batch_render_report.json", {})
        });
      });
    }

    return sendJson(res, 404, {
      success: false,
      error: "Admin API route not found",
      path: req.url
    });
  });
}

function startAdminApi() {
  const settings = safeReadJson(SETTINGS_FILE, {});
  const port = process.env.ADMIN_PORT || settings?.adminPlatform?.port || 7788;

  const server = createAdminServer();

  server.listen(port, () => {
    console.log(
      JSON.stringify(
        {
          success: true,
          service: "admin-platform",
          url: `http://localhost:${port}`,
          login: {
            username: "admin",
            password: "admin123"
          }
        },
        null,
        2
      )
    );
  });

  return server;
}

if (require.main === module) {
  startAdminApi();
}

module.exports = {
  createAdminServer,
  startAdminApi
};


/* PHASE_23_2_CONTENT_PACK_PREVIEW_API */
app.get("/api/admin/content-packs", (req, res) => {
  res.json(contentPackPreviewService.listContentPacks(req.query || {}));
});

app.get("/api/admin/content-packs/approval-center", (req, res) => {
  res.json(contentPackPreviewService.getApprovalCenter());
});

app.get("/api/admin/content-packs/:contentPackId/preview", (req, res) => {
  res.json(contentPackPreviewService.getPreview(req.params.contentPackId));
});

app.post("/api/admin/content-packs/:contentPackId/approve", (req, res) => {
  const approvedBy = (req.body && req.body.approvedBy) || "admin";
  res.json(contentPackPreviewService.approveContentPack(req.params.contentPackId, approvedBy));
});

app.post("/api/admin/content-packs/:contentPackId/launch", (req, res) => {
  res.json(contentPackPreviewService.launchContentPack(req.params.contentPackId, req.body || {}));
});
/* END_PHASE_23_2_CONTENT_PACK_PREVIEW_API */


/* PHASE_23_3_FACTORY_OPERATIONS_API */
app.get("/api/admin/factory/operations", (req, res) => {
  res.json(factoryOperationsService.getOperationsCenter());
});

app.post("/api/admin/factory/safe-mode", (req, res) => {
  const enabled = Boolean(req.body && req.body.enabled);
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(factoryOperationsService.setSafeMode(enabled, actor));
});

app.post("/api/admin/factory/emergency-stop", (req, res) => {
  const enabled = Boolean(req.body && req.body.enabled);
  const reason = (req.body && req.body.reason) || "";
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(factoryOperationsService.setEmergencyStop(enabled, reason, actor));
});

app.post("/api/admin/factory/recovery-action", (req, res) => {
  const actionId = req.body && req.body.actionId;
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(factoryOperationsService.runRecoveryAction(actionId, actor));
});
/* END_PHASE_23_3_FACTORY_OPERATIONS_API */


/* PHASE_23_4_FACTORY_AUDIT_API */
app.get("/api/admin/factory/audit", (req, res) => {
  res.json(factoryAuditService.getAuditCenter());
});

app.get("/api/admin/factory/audit/events", (req, res) => {
  res.json(factoryAuditService.listAuditEvents(req.query || {}));
});

app.get("/api/admin/factory/audit/verify", (req, res) => {
  res.json(factoryAuditService.verifyAuditChain());
});

app.post("/api/admin/factory/audit/export", (req, res) => {
  const format = (req.body && req.body.format) || "json";
  res.json(factoryAuditService.exportAuditReport(format));
});
/* END_PHASE_23_4_FACTORY_AUDIT_API */


/* PHASE_24_1_AUTONOMOUS_RUNTIME_API */
app.get("/api/admin/factory/autonomous-runtime", (req, res) => {
  res.json(autonomousRuntimeService.getRuntimeCenter());
});

app.post("/api/admin/factory/autonomous-runtime/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousRuntimeService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/autonomous-runtime/run-once", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousRuntimeService.runOnce(actor));
});
/* END_PHASE_24_1_AUTONOMOUS_RUNTIME_API */


/* PHASE_24_2_AUTONOMOUS_SCHEDULER_API */
app.get("/api/admin/factory/autonomous-scheduler", (req, res) => {
  res.json(autonomousSchedulerService.getSchedulerCenter());
});

app.post("/api/admin/factory/autonomous-scheduler/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousSchedulerService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/autonomous-scheduler/evaluate", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousSchedulerService.evaluateAndRun(actor));
});
/* END_PHASE_24_2_AUTONOMOUS_SCHEDULER_API */


/* PHASE_24_3_SELF_HEALING_RETRY_API */
app.get("/api/admin/factory/self-healing", (req, res) => {
  res.json(selfHealingRetryService.getRetryCenter());
});

app.post("/api/admin/factory/self-healing/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/self-healing/scan", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.scanRuntimeFailures(actor));
});

app.post("/api/admin/factory/self-healing/retry-next", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.runNextRetry(actor));
});

app.post("/api/admin/factory/self-healing/retry/:retryId", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(selfHealingRetryService.runRetry(req.params.retryId, actor));
});
/* END_PHASE_24_3_SELF_HEALING_RETRY_API */


/* PHASE_24_4_AUTONOMOUS_DECISION_API */
app.get("/api/admin/factory/autonomous-decisions", (req, res) => {
  res.json(autonomousDecisionService.getDecisionCenter());
});

app.post("/api/admin/factory/autonomous-decisions/config", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousDecisionService.updateConfig(req.body || {}, actor));
});

app.post("/api/admin/factory/autonomous-decisions/evaluate", (req, res) => {
  const actor = (req.body && req.body.actor) || "admin-api";
  res.json(autonomousDecisionService.evaluateAll(actor));
});
/* END_PHASE_24_4_AUTONOMOUS_DECISION_API */

