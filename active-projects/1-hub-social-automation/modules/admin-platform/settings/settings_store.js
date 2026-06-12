const fs = require("fs");
const path = require("path");

const SETTINGS_PATH = path.resolve(process.cwd(), "storage/admin/settings.json");

const DEFAULT_SETTINGS = {
  workflow: {
    maxConcurrentJobs: 3,
    autoRetry: true,
    retryLimit: 3
  },
  scheduler: {
    enabled: true,
    pollIntervalSeconds: 30
  },
  renderer: {
    maxConcurrentRenders: 2,
    defaultAspectRatio: "9:16"
  },
  providers: {
    fallbackEnabled: true
  },
  publishing: {
    enabled: false
  }
};

function ensureSettingsFile() {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }
}

function getSettings() {
  ensureSettingsFile();
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
}

function saveSettings(settings) {
  ensureSettingsFile();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  return getSettings();
}

function resetDefaults() {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  return getSettings();
}

module.exports = {
  SETTINGS_PATH,
  DEFAULT_SETTINGS,
  ensureSettingsFile,
  getSettings,
  saveSettings,
  resetDefaults
};
