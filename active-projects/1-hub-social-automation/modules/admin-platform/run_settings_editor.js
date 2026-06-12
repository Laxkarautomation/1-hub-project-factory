const settingsService = require("./settings/settings_service");

try {
  const settings = settingsService.getSettings();

  console.log(JSON.stringify({
    success: true,
    phase: "14.5-settings-editor",
    settingsLoaded: !!settings,
    sections: Object.keys(settings)
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }, null, 2));
  process.exit(1);
}
