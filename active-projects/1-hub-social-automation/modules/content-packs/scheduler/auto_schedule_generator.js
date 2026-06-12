const fs = require("fs");
const path = require("path");
const { listPacks, updatePackStatus } = require("../registry/content_pack_store");

const QUEUE_FILE = path.join(process.cwd(), "storage", "publishing", "publishing_queue.json");

function ensureQueue() {
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ jobs: [] }, null, 2));
  }
}

function normalizeQueue(raw) {
  if (!raw || typeof raw !== "object") return { jobs: [] };
  if (Array.isArray(raw.jobs)) return raw;
  if (Array.isArray(raw.queue)) return { ...raw, jobs: raw.queue };
  if (Array.isArray(raw.items)) return { ...raw, jobs: raw.items };
  if (Array.isArray(raw)) return { jobs: raw };
  return { ...raw, jobs: [] };
}

function readQueue() {
  ensureQueue();
  try {
    return normalizeQueue(JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8")));
  } catch {
    return { jobs: [] };
  }
}

function writeQueue(q) {
  ensureQueue();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(normalizeQueue(q), null, 2));
}

function nextSlot(index = 0, rules = {}) {
  const slots = rules.timeSlots || ["12:00", "18:00"];
  const now = new Date();
  const d = new Date(now);
  const [hh, mm] = slots[index % slots.length].split(":").map(Number);
  d.setHours(hh, mm, 0, 0);
  if (d <= now) d.setDate(d.getDate() + Math.floor(index / slots.length) + 1);
  return d.toISOString();
}

function createQueueJob(pack, provider, scheduledAt) {
  return {
    jobId: `pub_${pack.contentPackId}_${provider}_${Date.now()}`,
    type: "publish_content_pack",
    status: "queued",
    provider,
    channelId: pack.channelId,
    contentPackId: pack.contentPackId,
    scheduledAt,
    payload: pack.publishingMetadata,
    createdAt: new Date().toISOString()
  };
}

function autoCreatePublishingQueue(options = {}) {
  const packs = listPacks({ status: "publishable", channelId: options.channelId });
  const q = readQueue();

  const existing = new Set(
    q.jobs.map(j => `${j.contentPackId || j.payload?.contentPackId}:${j.provider || j.providerId}`)
  );

  let created = 0;

  packs.forEach((pack, i) => {
    const scheduledAt = nextSlot(i, options.rules);
    const providers = options.providers || pack.providerTargets || ["telegram"];

    providers.forEach(provider => {
      const key = `${pack.contentPackId}:${provider}`;
      if (existing.has(key)) return;
      q.jobs.push(createQueueJob(pack, provider, scheduledAt));
      created++;
    });

    updatePackStatus(pack.contentPackId, "scheduled", { scheduledAt });
  });

  writeQueue(q);

  return {
    success: true,
    scanned: packs.length,
    created,
    totalQueueJobs: q.jobs.length,
    queueFile: QUEUE_FILE
  };
}

module.exports = { autoCreatePublishingQueue };
