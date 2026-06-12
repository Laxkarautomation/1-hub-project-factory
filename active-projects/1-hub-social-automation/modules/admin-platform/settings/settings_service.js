const store = require("./settings_store");

function getSettings() {
  return store.getSettings();
}

function saveSettings(settings) {
  return store.saveSettings(settings);
}

function updateSection(section, values) {
  const settings = store.getSettings();

  if (!section || typeof section !== "string") {
    throw new Error("section is required");
  }

  if (!settings[section]) {
    settings[section] = {};
  }

  settings[section] = {
    ...settings[section],
    ...(values || {})
  };

  return store.saveSettings(settings);
}

function resetDefaults() {
  return store.resetDefaults();
}

module.exports = {
  getSettings,
  saveSettings,
  updateSection,
  resetDefaults
};
