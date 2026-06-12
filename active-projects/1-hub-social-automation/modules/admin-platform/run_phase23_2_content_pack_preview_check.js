const service = require("./services/content_pack_preview_service");

const center = service.getApprovalCenter();
const first = center.packs[0];

const result = {
  success: true,
  phase: "23.2-content-pack-preview-approval-center",
  checks: {
    approvalCenterLoaded: Boolean(center.success),
    registryBrowserReady: Array.isArray(center.packs),
    previewApiReady: first ? Boolean(service.getPreview(first.contentPackId).success) : true,
    safeModeIndicatorsReady: center.packs.every((p) => typeof p.safeMode === "boolean"),
    runHistoryCardsReady: Array.isArray(center.recentRuns)
  },
  summary: center.summary,
  samplePackId: first ? first.contentPackId : null
};

console.log(JSON.stringify(result, null, 2));

if (!result.success || Object.values(result.checks).some((v) => !v)) {
  process.exit(1);
}
