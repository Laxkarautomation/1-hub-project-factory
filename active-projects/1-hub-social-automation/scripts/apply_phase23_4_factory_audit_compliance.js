const fs = require("fs");
const path = require("path");

const root = process.cwd();
const p = (...x) => path.join(root, ...x);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
function write(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content);
}
function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}
function patchOnce(filePath, marker, patcher) {
  const src = read(filePath);
  if (src.includes(marker)) return false;
  write(filePath, patcher(src));
  return true;
}

write(p("modules/admin-platform/services/factory_audit_service.js"), `const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");

function auditFile() {
  return path.join(ROOT, "storage/admin-platform/factory_audit_log.json");
}

function reportDir() {
  return path.join(ROOT, "storage/admin-platform/audit-reports");
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function stableHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function appendAuditEvent(event) {
  const log = readJson(auditFile(), { immutable: true, events: [] });
  const previous = log.events[log.events.length - 1] || null;

  const auditEvent = {
    auditId: "aud_" + crypto.randomBytes(8).toString("hex"),
    createdAt: new Date().toISOString(),
    actor: event.actor || "system",
    action: event.action || "unknown_action",
    entityType: event.entityType || "factory",
    entityId: event.entityId || null,
    severity: event.severity || "info",
    channelId: event.channelId || null,
    provider: event.provider || null,
    metadata: event.metadata || {},
    previousHash: previous ? previous.hash : null
  };

  auditEvent.hash = stableHash({
    ...auditEvent,
    hash: undefined
  });

  log.events.push(auditEvent);
  log.updatedAt = new Date().toISOString();
  writeJson(auditFile(), log);

  return auditEvent;
}

function listAuditEvents(filters = {}) {
  const log = readJson(auditFile(), { immutable: true, events: [] });
  let events = log.events || [];

  if (filters.action) events = events.filter((e) => e.action === filters.action);
  if (filters.actor) events = events.filter((e) => e.actor === filters.actor);
  if (filters.entityType) events = events.filter((e) => e.entityType === filters.entityType);
  if (filters.entityId) events = events.filter((e) => e.entityId === filters.entityId);
  if (filters.channelId) events = events.filter((e) => e.channelId === filters.channelId);
  if (filters.provider) events = events.filter((e) => e.provider === filters.provider);

  const limit = Number(filters.limit || 100);
  return {
    success: true,
    total: events.length,
    events: events.slice(-limit).reverse()
  };
}

function verifyAuditChain() {
  const log = readJson(auditFile(), { immutable: true, events: [] });
  const events = log.events || [];

  let valid = true;
  const issues = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const expectedPreviousHash = i === 0 ? null : events[i - 1].hash;
    if (event.previousHash !== expectedPreviousHash) {
      valid = false;
      issues.push({ index: i, auditId: event.auditId, issue: "previous_hash_mismatch" });
    }

    const expectedHash = stableHash({ ...event, hash: undefined });
    if (event.hash !== expectedHash) {
      valid = false;
      issues.push({ index: i, auditId: event.auditId, issue: "event_hash_mismatch" });
    }
  }

  return {
    success: true,
    valid,
    totalEvents: events.length,
    issues
  };
}

function getAuditCenter() {
  const listed = listAuditEvents({ limit: 50 });
  const verify = verifyAuditChain();
  const events = listed.events || [];

  const counts = events.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
  }, {});

  return {
    success: true,
    phase: "23.4-factory-audit-compliance-layer",
    immutableChain: verify,
    summary: {
      totalEvents: verify.totalEvents,
      visibleEvents: events.length,
      chainValid: verify.valid,
      actions: counts
    },
    activityFeed: events,
    complianceFlags: verify.valid ? [] : ["AUDIT_CHAIN_INVALID"]
  };
}

function exportAuditReport(format = "json") {
  const center = getAuditCenter();
  const filename = "factory_audit_report_" + new Date().toISOString().replace(/[:.]/g, "-") + "." + format;
  const file = path.join(reportDir(), filename);

  if (format !== "json") {
    return { success: false, error: "UNSUPPORTED_AUDIT_REPORT_FORMAT", format };
  }

  writeJson(file, center);

  appendAuditEvent({
    actor: "system",
    action: "audit_report_exported",
    entityType: "audit_report",
    entityId: filename,
    severity: "info",
    metadata: { file: path.relative(ROOT, file), format }
  });

  return {
    success: true,
    format,
    file: path.relative(ROOT, file)
  };
}

module.exports = {
  appendAuditEvent,
  listAuditEvents,
  verifyAuditChain,
  getAuditCenter,
  exportAuditReport
};
`);

patchOnce(p("modules/admin-platform/services/content_pack_preview_service.js"), "PHASE_23_4_AUDIT_WIRE_CONTENT_PACKS", (src) => {
  let out = src;
  if (!out.includes("factory_audit_service")) {
    out = `const auditService = require("./factory_audit_service");
` + out;
  }

  out = out.replace(
    `saveApprovalState(state);

  return {
    success: true,
    contentPackId,
    approval: state.approvals[contentPackId]
  };`,
    `saveApprovalState(state);

  auditService.appendAuditEvent({
    actor: approvedBy,
    action: "content_pack_approved",
    entityType: "content_pack",
    entityId: contentPackId,
    channelId: preview.preview.channelId,
    severity: "info",
    metadata: {
      title: preview.preview.title,
      status: preview.preview.status,
      safeMode: preview.preview.safeMode
    }
  });

  return {
    success: true,
    contentPackId,
    approval: state.approvals[contentPackId]
  };`
  );

  out = out.replace(
    `saveApprovalState(state);

  return { success: true, run };`,
    `saveApprovalState(state);

  auditService.appendAuditEvent({
    actor: options.actor || "admin",
    action: "content_pack_launch_recorded",
    entityType: "content_pack",
    entityId: contentPackId,
    channelId: pack.channelId,
    severity: "info",
    metadata: {
      runId,
      providers,
      safeMode: run.safeMode,
      status: run.status
    }
  });

  return { success: true, run };`
  );

  return out + `
// PHASE_23_4_AUDIT_WIRE_CONTENT_PACKS
`;
});

patchOnce(p("modules/admin-platform/services/factory_operations_service.js"), "PHASE_23_4_AUDIT_WIRE_OPERATIONS", (src) => {
  let out = src;
  if (!out.includes("factory_audit_service")) {
    out = `const auditService = require("./factory_audit_service");
` + out;
  }

  out = out.replace(
    `addHistory({
    type: "safe_mode_changed",
    actor,
    enabled: state.safeMode
  });`,
    `addHistory({
    type: "safe_mode_changed",
    actor,
    enabled: state.safeMode
  });

  auditService.appendAuditEvent({
    actor,
    action: "factory_safe_mode_changed",
    entityType: "factory",
    entityId: "global",
    severity: "info",
    metadata: { enabled: state.safeMode }
  });`
  );

  out = out.replace(
    `addHistory({
    type: emergency.enabled ? "emergency_stop_enabled" : "emergency_stop_cleared",
    actor,
    reason
  });`,
    `addHistory({
    type: emergency.enabled ? "emergency_stop_enabled" : "emergency_stop_cleared",
    actor,
    reason
  });

  auditService.appendAuditEvent({
    actor,
    action: emergency.enabled ? "factory_emergency_stop_enabled" : "factory_emergency_stop_cleared",
    entityType: "factory",
    entityId: "global",
    severity: emergency.enabled ? "critical" : "warning",
    metadata: { reason }
  });`
  );

  out = out.replace(
    `addHistory({ type: "recovery_action", actor, actionId });`,
    `addHistory({ type: "recovery_action", actor, actionId });

  auditService.appendAuditEvent({
    actor,
    action: "factory_recovery_action",
    entityType: "factory",
    entityId: "global",
    severity: "warning",
    metadata: { actionId }
  });`
  );

  return out + `
// PHASE_23_4_AUDIT_WIRE_OPERATIONS
`;
});

patchOnce(p("modules/admin-platform/api/admin_api_server.js"), "PHASE_23_4_FACTORY_AUDIT_API", (src) => {
  let out = src;
  if (!out.includes("factory_audit_service")) {
    out = `
// PHASE_23_4_FACTORY_AUDIT_API
const factoryAuditService = require("../services/factory_audit_service");
` + out;
  }

  const routes = `
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

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + routes;
});

patchOnce(p("modules/admin-platform/ui/app.js"), "PHASE_23_4_FACTORY_AUDIT_UI", (src) => {
  return src + `

/* PHASE_23_4_FACTORY_AUDIT_UI */
async function loadFactoryAuditCenter() {
  const mountId = "factory-audit-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card factory-audit-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Factory Audit + Compliance</h2><p>Loading audit trail...</p>";

  try {
    const res = await fetch("/api/admin/factory/audit");
    const data = await res.json();

    const summary = data.summary || {};
    const valid = summary.chainValid;

    mount.innerHTML = \`
      <h2>Factory Audit + Compliance</h2>

      <div class="ops-status-row">
        <span class="\${valid ? "ok-pill" : "danger-pill"}">Immutable Chain: \${valid ? "VALID" : "INVALID"}</span>
        <span class="status-pill">Events: \${summary.totalEvents || 0}</span>
        <button onclick="exportFactoryAuditReport()">Export Audit Report</button>
        <button onclick="loadFactoryAuditCenter()">Refresh Audit</button>
      </div>

      <div class="summary-grid">
        <div>Total Events: <b>\${summary.totalEvents || 0}</b></div>
        <div>Visible Feed: <b>\${summary.visibleEvents || 0}</b></div>
        <div>Compliance Flags: <b>\${(data.complianceFlags || []).length}</b></div>
        <div>Chain Issues: <b>\${(data.immutableChain.issues || []).length}</b></div>
      </div>

      <h3>Admin Activity Feed</h3>
      <div class="audit-feed">
        \${(data.activityFeed || []).map(e => \`
          <div class="audit-card">
            <div class="audit-card-head">
              <b>\${e.action}</b>
              <span class="\${e.severity === "critical" ? "danger-pill" : "ok-pill"}">\${e.severity}</span>
            </div>
            <p>\${e.entityType} / \${e.entityId || "global"} • Actor: \${e.actor}</p>
            <small>\${e.createdAt}</small>
            <pre class="ops-json">\${JSON.stringify(e.metadata || {}, null, 2)}</pre>
          </div>
        \`).join("") || "<p>No audit events yet.</p>"}
      </div>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Factory Audit + Compliance</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function exportFactoryAuditReport() {
  const res = await fetch("/api/admin/factory/audit/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "json" })
  });
  const data = await res.json();
  alert(data.success ? "Audit report exported: " + data.file : "Export failed");
  await loadFactoryAuditCenter();
}

if (typeof window !== "undefined") {
  window.loadFactoryAuditCenter = loadFactoryAuditCenter;
  window.exportFactoryAuditReport = exportFactoryAuditReport;
  window.addEventListener("DOMContentLoaded", loadFactoryAuditCenter);
}
/* END_PHASE_23_4_FACTORY_AUDIT_UI */
`;
});

patchOnce(p("modules/admin-platform/ui/style.css"), "PHASE_23_4_FACTORY_AUDIT_STYLES", (src) => {
  return src + `

/* PHASE_23_4_FACTORY_AUDIT_STYLES */
.factory-audit-center { margin: 24px 0; padding: 20px; border: 2px solid #ddd; border-radius: 16px; }
.audit-feed { display: grid; gap: 12px; }
.audit-card { border: 1px solid #ddd; border-radius: 14px; padding: 12px; }
.audit-card-head { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
/* END_PHASE_23_4_FACTORY_AUDIT_STYLES */
`;
});

write(p("storage/admin-platform/factory_audit_log.json"), JSON.stringify({
  immutable: true,
  updatedAt: null,
  events: []
}, null, 2));

write(p("modules/admin-platform/run_phase23_4_factory_audit_check.js"), `const audit = require("./services/factory_audit_service");
const ops = require("./services/factory_operations_service");

const event = audit.appendAuditEvent({
  actor: "phase23_4_check",
  action: "audit_check_event",
  entityType: "factory",
  entityId: "global",
  severity: "info",
  metadata: { check: true }
});

ops.setSafeMode(true, "phase23_4_check");
ops.setEmergencyStop(false, "phase23_4_check_clear", "phase23_4_check");

const center = audit.getAuditCenter();
const verify = audit.verifyAuditChain();
const exported = audit.exportAuditReport("json");

const result = {
  success: true,
  phase: "23.4-factory-audit-compliance-layer",
  checks: {
    auditEventAppendReady: Boolean(event.auditId),
    auditCenterReady: Boolean(center.success),
    immutableChainReady: Boolean(verify.success),
    immutableChainValid: Boolean(verify.valid),
    auditReportExportReady: Boolean(exported.success),
    activityFeedReady: Array.isArray(center.activityFeed),
    complianceFlagsReady: Array.isArray(center.complianceFlags)
  },
  summary: center.summary,
  exported
};

console.log(JSON.stringify(result, null, 2));

if (Object.values(result.checks).some((v) => !v)) {
  process.exit(1);
}
`);

console.log(JSON.stringify({
  success: true,
  phase: "23.4-factory-audit-compliance-layer",
  files: [
    "modules/admin-platform/services/factory_audit_service.js",
    "modules/admin-platform/services/content_pack_preview_service.js",
    "modules/admin-platform/services/factory_operations_service.js",
    "modules/admin-platform/api/admin_api_server.js",
    "modules/admin-platform/ui/app.js",
    "modules/admin-platform/ui/style.css",
    "modules/admin-platform/run_phase23_4_factory_audit_check.js",
    "storage/admin-platform/factory_audit_log.json"
  ]
}, null, 2));
