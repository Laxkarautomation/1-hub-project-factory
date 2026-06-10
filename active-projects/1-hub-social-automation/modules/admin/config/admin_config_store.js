const fs = require("fs");
const path = require("path");
const { DEFAULT_ADMIN_CONFIG } = require("./admin_defaults");

const ADMIN_STORAGE_DIR = path.join(process.cwd(), "storage", "admin");
const ADMIN_CONFIG_PATH = path.join(ADMIN_STORAGE_DIR, "admin_config.json");

function ensureAdminStorage() {
  if (!fs.existsSync(ADMIN_STORAGE_DIR)) {
    fs.mkdirSync(ADMIN_STORAGE_DIR, { recursive: true });
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureAdminStorage();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadAdminConfig() {
  ensureAdminStorage();

  if (!fs.existsSync(ADMIN_CONFIG_PATH)) {
    const fresh = deepClone(DEFAULT_ADMIN_CONFIG);
    writeJson(ADMIN_CONFIG_PATH, fresh);
    return fresh;
  }

  const current = readJsonSafe(ADMIN_CONFIG_PATH, null);

  if (!current || typeof current !== "object") {
    const fresh = deepClone(DEFAULT_ADMIN_CONFIG);
    writeJson(ADMIN_CONFIG_PATH, fresh);
    return fresh;
  }

  return mergeDefaults(deepClone(DEFAULT_ADMIN_CONFIG), current);
}

function saveAdminConfig(config) {
  writeJson(ADMIN_CONFIG_PATH, config);
  return config;
}

function mergeDefaults(defaults, current) {
  if (!current || typeof current !== "object") return defaults;

  const output = Array.isArray(defaults) ? [...defaults] : { ...defaults };

  for (const key of Object.keys(current)) {
    if (
      current[key] &&
      typeof current[key] === "object" &&
      !Array.isArray(current[key]) &&
      defaults[key] &&
      typeof defaults[key] === "object" &&
      !Array.isArray(defaults[key])
    ) {
      output[key] = mergeDefaults(defaults[key], current[key]);
    } else {
      output[key] = current[key];
    }
  }

  return output;
}

function resetAdminConfig() {
  const fresh = deepClone(DEFAULT_ADMIN_CONFIG);
  saveAdminConfig(fresh);
  return fresh;
}

module.exports = {
  ADMIN_CONFIG_PATH,
  loadAdminConfig,
  saveAdminConfig,
  resetAdminConfig
};
