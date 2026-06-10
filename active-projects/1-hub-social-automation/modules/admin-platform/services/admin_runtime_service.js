const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SETTINGS_FILE = path.join(ROOT, "modules/admin-platform/storage/admin_settings.json");
const RUNTIME_STATE_FILE = path.join(ROOT, "modules/admin-platform/storage/runtime_state.json");

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

function getRuntimeState() {
  const settings = readJson(SETTINGS_FILE, {});
  const state = readJson(RUNTIME_STATE_FILE, {
    paused: false,
    reason: null,
    updatedAt: null
  });

  return {
    success: true,
    runtime: {
      paused: state.paused === true,
      reason: state.reason || null,
      updatedAt: state.updatedAt || null,
      controls: settings.runtimeControls || {}
    }
  };
}

function updateRuntimeControls(controls) {
  const settings = readJson(SETTINGS_FILE, {});

  settings.runtimeControls = {
    ...(settings.runtimeControls || {}),
    ...(controls || {})
  };

  writeJson(SETTINGS_FILE, settings);

  return {
    success: true,
    runtimeControls: settings.runtimeControls
  };
}

function pauseRuntime(reason = "Paused from admin platform") {
  const state = {
    paused: true,
    reason,
    updatedAt: new Date().toISOString()
  };

  writeJson(RUNTIME_STATE_FILE, state);

  return {
    success: true,
    runtime: state
  };
}

function resumeRuntime() {
  const state = {
    paused: false,
    reason: null,
    updatedAt: new Date().toISOString()
  };

  writeJson(RUNTIME_STATE_FILE, state);

  return {
    success: true,
    runtime: state
  };
}

function assertRuntimeAllowed(action) {
  const runtime = getRuntimeState().runtime;
  const controls = runtime.controls || {};

  if (runtime.paused) {
    return {
      success: false,
      allowed: false,
      action,
      error: "Runtime is paused",
      reason: runtime.reason
    };
  }

  const map = {
    pipeline_run: "allowPipelineRun",
    job_retry: "allowJobRetry",
    provider_switch: "allowProviderSwitch",
    channel_switch: "allowChannelSwitch"
  };

  const key = map[action];

  if (key && controls[key] === false) {
    return {
      success: false,
      allowed: false,
      action,
      error: `${action} is disabled by admin runtime controls`
    };
  }

  return {
    success: true,
    allowed: true,
    action
  };
}

module.exports = {
  getRuntimeState,
  updateRuntimeControls,
  pauseRuntime,
  resumeRuntime,
  assertRuntimeAllowed
};
