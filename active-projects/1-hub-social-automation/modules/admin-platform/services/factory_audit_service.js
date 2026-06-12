const fs = require("fs");
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
