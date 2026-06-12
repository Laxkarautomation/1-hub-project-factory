const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "storage", "content-packs");
const PACKS = path.join(ROOT, "packs.json");

function ensure() {
  fs.mkdirSync(ROOT, { recursive: true });
  if (!fs.existsSync(PACKS)) fs.writeFileSync(PACKS, JSON.stringify({ packs: [] }, null, 2));
}

function read() {
  ensure();
  return JSON.parse(fs.readFileSync(PACKS, "utf8"));
}

function write(data) {
  ensure();
  fs.writeFileSync(PACKS, JSON.stringify(data, null, 2));
}

function upsertPack(pack) {
  const data = read();
  const now = new Date().toISOString();
  const next = { ...pack, updatedAt: now, createdAt: pack.createdAt || now };
  const idx = data.packs.findIndex(p => p.contentPackId === next.contentPackId);
  if (idx >= 0) data.packs[idx] = { ...data.packs[idx], ...next };
  else data.packs.push(next);
  write(data);
  return next;
}

function listPacks(filter = {}) {
  const data = read();
  return data.packs.filter(p => {
    if (filter.channelId && p.channelId !== filter.channelId) return false;
    if (filter.status && p.status !== filter.status) return false;
    return true;
  });
}

function getPack(id) {
  return read().packs.find(p => p.contentPackId === id) || null;
}

function updatePackStatus(id, status, extra = {}) {
  const pack = getPack(id);
  if (!pack) return null;
  return upsertPack({ ...pack, status, ...extra });
}

module.exports = { upsertPack, listPacks, getPack, updatePackStatus, ROOT };
