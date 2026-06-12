const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");

function safeReadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function safeWriteJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function findContentPacks() {
  const roots = [
    path.join(ROOT, "storage/content-packs"),
    path.join(ROOT, "modules/content-packs/output"),
    path.join(ROOT, "storage/publishing"),
    path.join(ROOT, "modules/content-packs/registry")
  ];

  const files = roots.flatMap((dir) => walk(dir))
    .filter((f) => f.endsWith(".json"))
    .filter((f) => !f.includes("approval_center.json"));

  const packs = [];
  for (const file of files) {
    const json = safeReadJson(file, null);
    if (!json || typeof json !== "object") continue;

    const candidate = json.pack || json.contentPack || json;
    const contentPackId = candidate.contentPackId || candidate.id || json.contentPackId;
    if (!contentPackId) continue;

    packs.push(normalizePack(candidate, file));
  }

  const seen = new Map();
  for (const pack of packs) seen.set(pack.contentPackId, pack);
  return [...seen.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function normalizePack(pack, file) {
  const assets = pack.assets || pack.publishableAssets || pack.mediaAssets || [];
  const providerTargets = pack.providerTargets || pack.targets || pack.providers || [];
  return {
    contentPackId: pack.contentPackId || pack.id,
    channelId: pack.channelId || pack.channel || "unknown",
    status: pack.status || "unknown",
    source: pack.source || "registry",
    title: pack.title || pack.name || "Untitled Content Pack",
    description: pack.description || "",
    hashtags: pack.hashtags || [],
    providerTargets: Array.isArray(providerTargets) ? providerTargets : Object.keys(providerTargets || {}),
    schedule: pack.schedule || pack.schedulePlan || pack.publishSchedule || null,
    assets: Array.isArray(assets) ? assets : Object.values(assets || {}),
    safeMode: Boolean(pack.safeMode || pack.mode === "safe-wiring" || pack.mode === "safe"),
    updatedAt: pack.updatedAt || pack.createdAt || null,
    registryFile: path.relative(ROOT, file),
    raw: pack
  };
}

function approvalFile() {
  return path.join(ROOT, "storage/admin-platform/content_pack_approval_center.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/content_pack_launch_history.json");
}

function getApprovalState() {
  return safeReadJson(approvalFile(), { approvals: {}, updatedAt: null });
}

function saveApprovalState(state) {
  state.updatedAt = new Date().toISOString();
  safeWriteJson(approvalFile(), state);
}

function getHistory() {
  return safeReadJson(historyFile(), { runs: [] });
}

function saveHistory(history) {
  safeWriteJson(historyFile(), history);
}

function listContentPacks(filters = {}) {
  let packs = findContentPacks();
  const state = getApprovalState();

  packs = packs.map((pack) => ({
    ...pack,
    approval: state.approvals[pack.contentPackId] || {
      approved: false,
      approvedAt: null,
      approvedBy: null,
      launchStatus: "not_launched"
    }
  }));

  if (filters.channelId) packs = packs.filter((p) => p.channelId === filters.channelId);
  if (filters.status) packs = packs.filter((p) => p.status === filters.status);
  if (filters.provider) packs = packs.filter((p) => p.providerTargets.includes(filters.provider));

  return {
    success: true,
    total: packs.length,
    filters,
    packs
  };
}

function getPreview(contentPackId) {
  const pack = findContentPacks().find((p) => p.contentPackId === contentPackId);
  if (!pack) {
    return { success: false, error: "CONTENT_PACK_NOT_FOUND", contentPackId };
  }

  const state = getApprovalState();
  const history = getHistory();

  return {
    success: true,
    preview: {
      ...pack,
      approval: state.approvals[contentPackId] || {
        approved: false,
        approvedAt: null,
        approvedBy: null,
        launchStatus: "not_launched"
      },
      schedulePreview: buildSchedulePreview(pack),
      assetPreview: buildAssetPreview(pack),
      providerLaunchPreview: buildProviderLaunchPreview(pack),
      runHistory: history.runs.filter((r) => r.contentPackId === contentPackId).slice(-10).reverse()
    }
  };
}

function buildAssetPreview(pack) {
  const assets = pack.assets || [];
  return assets.map((asset, index) => {
    const assetPath = asset.path || asset.filePath || asset.outputPath || asset;
    const abs = typeof assetPath === "string" ? path.resolve(ROOT, assetPath) : null;
    return {
      index,
      type: asset.type || asset.kind || guessType(assetPath),
      label: asset.label || asset.name || path.basename(String(assetPath || "asset")),
      path: assetPath,
      exists: abs ? fs.existsSync(abs) : false,
      sizeBytes: abs && fs.existsSync(abs) ? fs.statSync(abs).size : null,
      safeMode: pack.safeMode
    };
  });
}

function guessType(assetPath) {
  const ext = path.extname(String(assetPath || "")).toLowerCase();
  if ([".mp4", ".mov", ".webm"].includes(ext)) return "video";
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return "image";
  if ([".mp3", ".wav"].includes(ext)) return "audio";
  return "unknown";
}

function buildSchedulePreview(pack) {
  const schedule = pack.schedule || {};
  return {
    hasSchedule: Boolean(pack.schedule),
    mode: schedule.mode || schedule.type || "manual",
    scheduledAt: schedule.scheduledAt || schedule.dateTime || null,
    timezone: schedule.timezone || "Asia/Kolkata",
    raw: schedule
  };
}

function buildProviderLaunchPreview(pack) {
  return (pack.providerTargets || []).map((provider) => ({
    provider,
    channelId: pack.channelId,
    launchAllowed: pack.status === "publishable",
    safeMode: pack.safeMode,
    reason: pack.status === "publishable" ? "ready_for_approval_launch" : "pack_not_publishable"
  }));
}

function approveContentPack(contentPackId, approvedBy = "admin") {
  const preview = getPreview(contentPackId);
  if (!preview.success) return preview;

  const state = getApprovalState();
  state.approvals[contentPackId] = {
    approved: true,
    approvedAt: new Date().toISOString(),
    approvedBy,
    launchStatus: "approved"
  };
  saveApprovalState(state);

  return {
    success: true,
    contentPackId,
    approval: state.approvals[contentPackId]
  };
}

function launchContentPack(contentPackId, options = {}) {
  const preview = getPreview(contentPackId);
  if (!preview.success) return preview;

  const pack = preview.preview;
  const state = getApprovalState();
  const approval = state.approvals[contentPackId];

  if (!approval || !approval.approved) {
    return {
      success: false,
      error: "CONTENT_PACK_NOT_APPROVED",
      contentPackId
    };
  }

  const runId = "cpl_" + crypto.randomBytes(6).toString("hex");
  const providers = options.providers && options.providers.length ? options.providers : pack.providerTargets;

  const run = {
    runId,
    contentPackId,
    channelId: pack.channelId,
    providers,
    safeMode: pack.safeMode || Boolean(options.safeMode),
    status: pack.safeMode || options.safeMode ? "safe_mode_launch_recorded" : "launch_queued",
    createdAt: new Date().toISOString(),
    message: "Phase 23.2 approval center recorded launch intent. Real provider dispatch remains behind publishing bridge."
  };

  const history = getHistory();
  history.runs.push(run);
  saveHistory(history);

  state.approvals[contentPackId] = {
    ...approval,
    launchStatus: run.status,
    lastRunId: runId,
    lastLaunchAt: run.createdAt
  };
  saveApprovalState(state);

  return { success: true, run };
}

function getApprovalCenter() {
  const listed = listContentPacks();
  const history = getHistory();
  return {
    success: true,
    summary: {
      totalPacks: listed.total,
      approved: listed.packs.filter((p) => p.approval.approved).length,
      publishable: listed.packs.filter((p) => p.status === "publishable").length,
      safeMode: listed.packs.filter((p) => p.safeMode).length,
      launches: history.runs.length
    },
    packs: listed.packs,
    recentRuns: history.runs.slice(-12).reverse()
  };
}

module.exports = {
  listContentPacks,
  getPreview,
  approveContentPack,
  launchContentPack,
  getApprovalCenter
};
