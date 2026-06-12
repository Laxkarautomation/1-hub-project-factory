const audit = require("./services/factory_audit_service");
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
