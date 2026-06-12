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
  let src = read(filePath);
  if (src.includes(marker)) return false;
  const next = patcher(src);
  write(filePath, next);
  return true;
}

const serviceFile = p("modules/admin-platform/services/content_pack_preview_service.js");
write(serviceFile, `const fs = require("fs");
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
`);

const apiFile = p("modules/admin-platform/api/admin_api_server.js");
patchOnce(apiFile, "PHASE_23_2_CONTENT_PACK_PREVIEW_API", (src) => {
  const requireLine = `
// PHASE_23_2_CONTENT_PACK_PREVIEW_API
const contentPackPreviewService = require("../services/content_pack_preview_service");
`;
  let out = src;
  if (!out.includes("content_pack_preview_service")) {
    out = requireLine + out;
  }

  const routes = `
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

`;

  const idx = out.lastIndexOf("app.listen");
  if (idx >= 0) return out.slice(0, idx) + routes + out.slice(idx);
  return out + "\n" + routes;
});

const uiFile = p("modules/admin-platform/ui/app.js");
patchOnce(uiFile, "PHASE_23_2_CONTENT_PACK_APPROVAL_UI", (src) => {
  return src + `

/* PHASE_23_2_CONTENT_PACK_APPROVAL_UI */
async function loadContentPackApprovalCenter() {
  const mountId = "content-pack-approval-center";
  let mount = document.getElementById(mountId);
  if (!mount) {
    mount = document.createElement("section");
    mount.id = mountId;
    mount.className = "admin-card content-pack-approval-center";
    document.body.appendChild(mount);
  }

  mount.innerHTML = "<h2>Content Pack Preview + Approval Center</h2><p>Loading content packs...</p>";

  try {
    const res = await fetch("/api/admin/content-packs/approval-center");
    const data = await res.json();

    if (!data.success) {
      mount.innerHTML = "<h2>Content Pack Preview + Approval Center</h2><p class='danger'>Failed to load approval center.</p>";
      return;
    }

    const cards = (data.packs || []).map((pack) => {
      const approval = pack.approval || {};
      const safe = pack.safeMode ? "<span class='safe-badge'>SAFE MODE</span>" : "";
      const providers = (pack.providerTargets || []).map((p) => "<span class='provider-pill'>" + p + "</span>").join(" ");
      return \`
        <div class="content-pack-card" data-pack-id="\${pack.contentPackId}">
          <div class="content-pack-head">
            <div>
              <h3>\${pack.title || pack.contentPackId}</h3>
              <p>\${pack.contentPackId} • Channel: \${pack.channelId}</p>
            </div>
            <div>\${safe}<span class="status-pill">\${pack.status}</span></div>
          </div>
          <p>\${pack.description || ""}</p>
          <div class="provider-row">\${providers}</div>
          <div class="approval-row">
            <span>Approval: \${approval.approved ? "Approved" : "Pending"}</span>
            <span>Launch: \${approval.launchStatus || "not_launched"}</span>
          </div>
          <div class="button-row">
            <button onclick="previewContentPack('\${pack.contentPackId}')">Preview</button>
            <button onclick="approveContentPack('\${pack.contentPackId}')">Approve</button>
            <button onclick="launchContentPack('\${pack.contentPackId}')">Launch</button>
          </div>
          <pre id="preview-\${pack.contentPackId}" class="pack-preview hidden"></pre>
        </div>
      \`;
    }).join("");

    mount.innerHTML = \`
      <h2>Content Pack Preview + Approval Center</h2>
      <div class="summary-grid">
        <div>Total Packs: <b>\${data.summary.totalPacks}</b></div>
        <div>Publishable: <b>\${data.summary.publishable}</b></div>
        <div>Approved: <b>\${data.summary.approved}</b></div>
        <div>Safe Mode: <b>\${data.summary.safeMode}</b></div>
      </div>
      <div class="content-pack-list">\${cards || "<p>No content packs found.</p>"}</div>
    \`;
  } catch (err) {
    mount.innerHTML = "<h2>Content Pack Preview + Approval Center</h2><p class='danger'>" + err.message + "</p>";
  }
}

async function previewContentPack(contentPackId) {
  const box = document.getElementById("preview-" + contentPackId);
  const res = await fetch("/api/admin/content-packs/" + contentPackId + "/preview");
  const data = await res.json();
  box.classList.remove("hidden");
  box.textContent = JSON.stringify(data.preview || data, null, 2);
}

async function approveContentPack(contentPackId) {
  await fetch("/api/admin/content-packs/" + contentPackId + "/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approvedBy: "admin-ui" })
  });
  await loadContentPackApprovalCenter();
}

async function launchContentPack(contentPackId) {
  await fetch("/api/admin/content-packs/" + contentPackId + "/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ safeMode: true })
  });
  await loadContentPackApprovalCenter();
}

if (typeof window !== "undefined") {
  window.previewContentPack = previewContentPack;
  window.approveContentPack = approveContentPack;
  window.launchContentPack = launchContentPack;
  window.addEventListener("DOMContentLoaded", loadContentPackApprovalCenter);
}
/* END_PHASE_23_2_CONTENT_PACK_APPROVAL_UI */
`;
});

const cssFile = p("modules/admin-platform/ui/style.css");
patchOnce(cssFile, "PHASE_23_2_CONTENT_PACK_APPROVAL_STYLES", (src) => {
  return src + `

/* PHASE_23_2_CONTENT_PACK_APPROVAL_STYLES */
.content-pack-approval-center { margin: 24px 0; padding: 20px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; margin: 14px 0 20px; }
.summary-grid > div { padding: 12px; border: 1px solid #ddd; border-radius: 12px; background: rgba(255,255,255,.04); }
.content-pack-list { display: grid; gap: 14px; }
.content-pack-card { border: 1px solid #ddd; border-radius: 14px; padding: 14px; }
.content-pack-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.status-pill, .provider-pill, .safe-badge { display: inline-block; padding: 4px 8px; border-radius: 999px; border: 1px solid #bbb; margin: 2px; font-size: 12px; }
.safe-badge { font-weight: 700; }
.provider-row, .approval-row, .button-row { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.button-row button { padding: 8px 12px; border-radius: 10px; cursor: pointer; }
.pack-preview { margin-top: 12px; max-height: 360px; overflow: auto; padding: 12px; border-radius: 12px; background: #111; color: #eee; }
.hidden { display: none; }
.danger { color: #c0392b; }
/* END_PHASE_23_2_CONTENT_PACK_APPROVAL_STYLES */
`;
});

const runnerFile = p("modules/admin-platform/run_phase23_2_content_pack_preview_check.js");
write(runnerFile, `const service = require("./services/content_pack_preview_service");

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
`);

write(p("storage/admin-platform/content_pack_approval_center.json"), JSON.stringify({ approvals: {}, updatedAt: null }, null, 2));
write(p("storage/admin-platform/content_pack_launch_history.json"), JSON.stringify({ runs: [] }, null, 2));

console.log(JSON.stringify({
  success: true,
  phase: "23.2-content-pack-preview-approval-center",
  files: [
    "modules/admin-platform/services/content_pack_preview_service.js",
    "modules/admin-platform/api/admin_api_server.js",
    "modules/admin-platform/ui/app.js",
    "modules/admin-platform/ui/style.css",
    "modules/admin-platform/run_phase23_2_content_pack_preview_check.js",
    "storage/admin-platform/content_pack_approval_center.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ]
}, null, 2));
