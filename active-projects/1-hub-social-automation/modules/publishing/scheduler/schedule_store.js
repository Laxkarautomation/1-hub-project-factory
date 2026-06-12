const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SCHEDULE_FILE = path.join(ROOT, "storage/publishing/schedules.json");
const RUNS_FILE = path.join(ROOT, "storage/publishing/scheduler_runs.json");

function ensureFile(file, fallback) {
  if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
}

function readJson(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureFile(file, data);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getSchedules() {
  const data = readJson(SCHEDULE_FILE, { version: 1, schedules: [] });
  return Array.isArray(data.schedules) ? data.schedules : [];
}

function saveSchedules(schedules) {
  writeJson(SCHEDULE_FILE, { version: 1, schedules });
}

function upsertSchedule(schedule) {
  const schedules = getSchedules();
  const now = new Date().toISOString();

  const item = {
    id: schedule.id || `schedule_${Date.now()}`,
    channelId: schedule.channelId || "default",
    providerId: schedule.providerId || "dry_run",
    contentId: schedule.contentId || null,
    payload: schedule.payload || {},
    publishAt: schedule.publishAt,
    status: schedule.status || "scheduled",
    attempts: schedule.attempts || 0,
    maxAttempts: schedule.maxAttempts || 3,
    createdAt: schedule.createdAt || now,
    updatedAt: now,
    lastEnqueuedAt: schedule.lastEnqueuedAt || null,
    queueJobId: schedule.queueJobId || null
  };

  const index = schedules.findIndex((s) => s.id === item.id);
  if (index >= 0) schedules[index] = { ...schedules[index], ...item };
  else schedules.push(item);

  saveSchedules(schedules);
  return item;
}

function updateSchedule(id, patch) {
  const schedules = getSchedules();
  const index = schedules.findIndex((s) => s.id === id);
  if (index < 0) return null;

  schedules[index] = {
    ...schedules[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };

  saveSchedules(schedules);
  return schedules[index];
}

function getDueSchedules(nowIso = new Date().toISOString()) {
  const now = new Date(nowIso).getTime();

  return getSchedules().filter((s) => {
    if (!s.publishAt) return false;
    if (s.status !== "scheduled") return false;
    if ((s.attempts || 0) >= (s.maxAttempts || 3)) return false;

    const publishTime = new Date(s.publishAt).getTime();
    return Number.isFinite(publishTime) && publishTime <= now;
  });
}

function getRuns() {
  const data = readJson(RUNS_FILE, { version: 1, runs: [] });
  return Array.isArray(data.runs) ? data.runs : [];
}

function saveRun(run) {
  const runs = getRuns();
  runs.unshift(run);
  writeJson(RUNS_FILE, { version: 1, runs: runs.slice(0, 100) });
  return run;
}

module.exports = {
  getSchedules,
  upsertSchedule,
  updateSchedule,
  getDueSchedules,
  getRuns,
  saveRun
};
