const http = require("http");
const fs = require("fs");
const path = require("path");

const { login, requireAuth } = require("../auth/admin_auth");
const {
  safeReadJson,
  getDashboardSnapshot
} = require("../services/admin_data_service");

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
