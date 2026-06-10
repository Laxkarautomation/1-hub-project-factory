const fs = require("fs");
const path = require("path");

const DEFAULT_USAGE_LOG_PATH = path.join(
  process.cwd(),
  "modules/providers/storage/provider_usage_log.json"
);

function ensureUsageLog(filePath = DEFAULT_USAGE_LOG_PATH) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
}

function readUsageLog(filePath = DEFAULT_USAGE_LOG_PATH) {
  ensureUsageLog(filePath);

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeUsageLog(entries, filePath = DEFAULT_USAGE_LOG_PATH) {
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

function appendUsageEntry(entry, filePath = DEFAULT_USAGE_LOG_PATH) {
  const entries = readUsageLog(filePath);

  const normalizedEntry = {
    id: entry.id || `usage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: entry.provider || "unknown",
    type: entry.type || "unknown",
    status: entry.status || "unknown",
    success: entry.success === true,
    keyId: entry.keyId || null,
    model: entry.model || null,
    durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : null,
    error: entry.error || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    metadata: entry.metadata || {}
  };

  entries.push(normalizedEntry);
  writeUsageLog(entries, filePath);

  return normalizedEntry;
}

module.exports = {
  DEFAULT_USAGE_LOG_PATH,
  ensureUsageLog,
  readUsageLog,
  writeUsageLog,
  appendUsageEntry
};
