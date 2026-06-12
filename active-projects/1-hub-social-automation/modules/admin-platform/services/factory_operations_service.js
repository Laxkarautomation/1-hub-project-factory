const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");

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

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function statFile(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return null;
  const s = fs.statSync(abs);
  return {
    file,
    sizeBytes: s.size,
    updatedAt: s.mtime.toISOString()
  };
}

function operationsFile() {
  return path.join(ROOT, "storage/admin-platform/factory_operations_state.json");
}

function emergencyFile() {
  return path.join(ROOT, "storage/admin-platform/factory_emergency_stop.json");
}

function historyFile() {
  return path.join(ROOT, "storage/admin-platform/factory_operations_history.json");
}

function getOpsState() {
  return readJson(operationsFile(), {
    safeMode: true,
    emergencyStop: false,
    updatedAt: null,
    notes: []
  });
}

function saveOpsState(state) {
  state.updatedAt = new Date().toISOString();
  writeJson(operationsFile(), state);
}

function addHistory(event) {
  const history = readJson(historyFile(), { events: [] });
  history.events.push({
    ...event,
    createdAt: new Date().toISOString()
  });
  writeJson(historyFile(), history);
}

function getProviderHealth() {
  const files = [
    "modules/providers/output/provider_health_status.json",
    "modules/providers/output/provider_summary.json",
    "storage/publishing/provider_health.json"
  ];

  return files.map((file) => ({
    source: file,
    exists: exists(file),
    stat: statFile(file),
    data: readJson(path.join(ROOT, file), null)
  }));
}

function getChannelHealth() {
  const active = readJson(path.join(ROOT, "modules/channels/storage/active_channel.json"), null);
  const registry = readJson(path.join(ROOT, "modules/channels/storage/channels.json"), []);
  return {
    activeChannel: active,
    totalChannels: Array.isArray(registry) ? registry.length : Object.keys(registry || {}).length,
    registryExists: exists("modules/channels/storage/channels.json")
  };
}

function getQueueMonitor() {
  const candidates = [
    "storage/jobs/job_queue.json",
    "storage/publishing/publishing_queue.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ];

  return candidates.map((file) => ({
    source: file,
    exists: exists(file),
    stat: statFile(file),
    data: readJson(path.join(ROOT, file), null)
  }));
}

function getPublishingMonitor() {
  const files = [
    "storage/publishing/publish_history.json",
    "storage/publishing/publishing_queue.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ];

  return files.map((file) => ({
    source: file,
    exists: exists(file),
    stat: statFile(file),
    data: readJson(path.join(ROOT, file), null)
  }));
}

function getRecentRuns() {
  const sources = [
    readJson(path.join(ROOT, "storage/admin-platform/content_pack_launch_history.json"), { runs: [] }).runs || [],
    readJson(path.join(ROOT, "storage/admin-platform/factory_operations_history.json"), { events: [] }).events || [],
    readJson(path.join(ROOT, "storage/pipeline/pipeline_run_history.json"), { runs: [] }).runs || []
  ];

  return sources.flat()
    .sort((a, b) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")))
    .slice(0, 20);
}

function getFailureDiagnostics() {
  const watched = [
    "storage/pipeline/latest_pipeline_report.json",
    "modules/video-renderer/output/batch_render_report.json",
    "modules/content-packs/output/content_pack_registry_check.json",
    "storage/admin-platform/content_pack_launch_history.json"
  ];

  return watched.map((file) => {
    const data = readJson(path.join(ROOT, file), null);
    const raw = JSON.stringify(data || {});
    return {
      source: file,
      exists: exists(file),
      hasFailureSignal: /false|error|failed|fail/i.test(raw),
      stat: statFile(file)
    };
  });
}

function getMetrics() {
  const providerHealth = getProviderHealth();
  const queue = getQueueMonitor();
  const publishing = getPublishingMonitor();
  const failures = getFailureDiagnostics();

  return {
    providerSourcesOnline: providerHealth.filter((x) => x.exists).length,
    queueSourcesOnline: queue.filter((x) => x.exists).length,
    publishingSourcesOnline: publishing.filter((x) => x.exists).length,
    failureSignals: failures.filter((x) => x.hasFailureSignal).length,
    recentRuns: getRecentRuns().length
  };
}

function getOperationsCenter() {
  const state = getOpsState();
  const emergency = readJson(emergencyFile(), { enabled: false, reason: null, updatedAt: null });

  return {
    success: true,
    phase: "23.3-factory-operations-center",
    state: {
      ...state,
      emergencyStop: Boolean(emergency.enabled)
    },
    metrics: getMetrics(),
    monitors: {
      providerHealth: getProviderHealth(),
      channelHealth: getChannelHealth(),
      queue: getQueueMonitor(),
      publishing: getPublishingMonitor()
    },
    recentRuns: getRecentRuns(),
    failureDiagnostics: getFailureDiagnostics(),
    recoveryActions: [
      { id: "refresh_status", label: "Refresh Factory Status", safe: true },
      { id: "resume_safe_mode", label: "Resume in Safe Mode", safe: true },
      { id: "clear_emergency_stop", label: "Clear Emergency Stop", safe: true },
      { id: "recheck_providers", label: "Recheck Providers", safe: true }
    ]
  };
}

function setSafeMode(enabled, actor = "admin") {
  const state = getOpsState();
  state.safeMode = Boolean(enabled);
  saveOpsState(state);
  addHistory({
    type: "safe_mode_changed",
    actor,
    enabled: state.safeMode
  });
  return { success: true, safeMode: state.safeMode };
}

function setEmergencyStop(enabled, reason = "", actor = "admin") {
  const emergency = {
    enabled: Boolean(enabled),
    reason,
    actor,
    updatedAt: new Date().toISOString()
  };
  writeJson(emergencyFile(), emergency);

  const state = getOpsState();
  state.emergencyStop = emergency.enabled;
  saveOpsState(state);

  addHistory({
    type: emergency.enabled ? "emergency_stop_enabled" : "emergency_stop_cleared",
    actor,
    reason
  });

  return { success: true, emergencyStop: emergency };
}

function runRecoveryAction(actionId, actor = "admin") {
  const valid = ["refresh_status", "resume_safe_mode", "clear_emergency_stop", "recheck_providers"];
  if (!valid.includes(actionId)) {
    return { success: false, error: "UNKNOWN_RECOVERY_ACTION", actionId };
  }

  if (actionId === "resume_safe_mode") setSafeMode(true, actor);
  if (actionId === "clear_emergency_stop") setEmergencyStop(false, "cleared_by_recovery_action", actor);

  addHistory({ type: "recovery_action", actor, actionId });

  return {
    success: true,
    actionId,
    operationsCenter: getOperationsCenter()
  };
}

module.exports = {
  getOperationsCenter,
  setSafeMode,
  setEmergencyStop,
  runRecoveryAction
};
