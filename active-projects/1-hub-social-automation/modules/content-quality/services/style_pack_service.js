'use strict';

const path = require('path');
const fs = require('fs');

// ─── Load config once at startup ────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'style_packs.json');

let _stylePacksCache = null;

function loadStylePacks() {
  if (_stylePacksCache) return _stylePacksCache;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    _stylePacksCache = JSON.parse(raw);
    return _stylePacksCache;
  } catch (err) {
    throw new Error(`[StylePackService] Failed to load style_packs.json: ${err.message}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolve a style pack for the given channel key.
 * Falls back to DEFAULT if channel not found.
 *
 * @param {string} channelKey  e.g. "UNRAAZ", "BRIGHTFLOW"
 * @returns {object} stylePack
 */
function getStylePack(channelKey) {
  const config = loadStylePacks();
  const channels = config.channels || {};
  const key = (channelKey || 'DEFAULT').toUpperCase().trim();
  const pack = channels[key] || channels['DEFAULT'];
  if (!channels[key]) {
    console.warn(`[StylePackService] Channel "${channelKey}" not found — falling back to DEFAULT`);
  }
  return pack;
}

/**
 * List all registered channel keys.
 * @returns {string[]}
 */
function listChannels() {
  const config = loadStylePacks();
  return Object.keys(config.channels || {});
}

/**
 * Check whether a channel key exists in config.
 * @param {string} channelKey
 * @returns {boolean}
 */
function channelExists(channelKey) {
  const config = loadStylePacks();
  const key = (channelKey || '').toUpperCase().trim();
  return Object.prototype.hasOwnProperty.call(config.channels || {}, key);
}

module.exports = {
  getStylePack,
  listChannels,
  channelExists,
};
