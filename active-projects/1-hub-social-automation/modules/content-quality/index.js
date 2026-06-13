'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  modules/content-quality/index.js
//  Content Quality Engine
//
//  Position in pipeline:
//    Script Generation → [Content Quality Engine] → Image Factory → Audio → Video
//
//  Contract:
//    INPUT:  ScriptPayload  (see below)
//    OUTPUT: ScriptPayload  (same shape, enhanced fields, quality metadata added)
//
//  No external dependencies. No I/O beyond reading style_packs.json on startup.
// ─────────────────────────────────────────────────────────────────────────────

const { getStylePack, listChannels } = require('./services/style_pack_service');
const { enhanceNarration }           = require('./services/narration_enhancer');
const { enhanceImagePrompt }         = require('./services/prompt_enhancer');

// ─── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} Scene
 * @property {number} scene
 * @property {number} duration_seconds
 * @property {string} narration
 * @property {string} image_prompt
 */

/**
 * @typedef {Object} ScriptPayload
 * @property {string}  script_id
 * @property {string}  title
 * @property {string}  [channel]        Channel key e.g. "UNRAAZ". Defaults to "DEFAULT".
 * @property {Scene[]} scenes
 */

/**
 * @typedef {Object} QualityResult
 * @property {string}      script_id
 * @property {string}      title
 * @property {string}      channel
 * @property {Scene[]}     scenes
 * @property {object}      quality_meta
 */

// ─── Subject Anchor Extraction ───────────────────────────────────────────────

/**
 * Derive a consistent subject anchor from the script title for subject_lock.
 * Strips common stop words, returns the first 2-3 meaningful words.
 * @param {string} title
 * @returns {string}
 */
function extractSubjectAnchor(title) {
  const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'for', 'with', 'by']);
  const words = title
    .split(/\s+/)
    .filter((w) => !STOP.has(w.toLowerCase()))
    .slice(0, 3);
  return words.join(' ');
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate the incoming payload shape.
 * @param {ScriptPayload} payload
 * @throws {Error} if payload is malformed
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('[ContentQuality] Payload must be a non-null object');
  }
  if (!payload.script_id || typeof payload.script_id !== 'string') {
    throw new Error('[ContentQuality] payload.script_id is required (string)');
  }
  if (!payload.title || typeof payload.title !== 'string') {
    throw new Error('[ContentQuality] payload.title is required (string)');
  }
  if (!Array.isArray(payload.scenes) || payload.scenes.length === 0) {
    throw new Error('[ContentQuality] payload.scenes must be a non-empty array');
  }
  payload.scenes.forEach((scene, i) => {
    if (typeof scene.scene !== 'number') {
      throw new Error(`[ContentQuality] scenes[${i}].scene must be a number`);
    }
    if (typeof scene.narration !== 'string') {
      throw new Error(`[ContentQuality] scenes[${i}].narration must be a string`);
    }
    if (typeof scene.image_prompt !== 'string') {
      throw new Error(`[ContentQuality] scenes[${i}].image_prompt must be a string`);
    }
  });
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Run the Content Quality Engine on a script payload.
 *
 * @param {ScriptPayload} payload
 * @param {object}        [options]
 * @param {boolean}       [options.verbose=false]   Log per-scene changes
 * @returns {QualityResult}
 */
function runQualityEngine(payload, options = {}) {
  const verbose = options.verbose === true;
  const startTime = Date.now();

  // 1. Validate
  validatePayload(payload);

  // 2. Resolve channel & style pack
  const channelKey  = (payload.channel || 'DEFAULT').toUpperCase().trim();
  const stylePack   = getStylePack(channelKey);
  const totalScenes = payload.scenes.length;

  if (verbose) {
    console.log(`[ContentQuality] script_id=${payload.script_id} channel=${channelKey} scenes=${totalScenes}`);
  }

  // 3. Derive subject anchor for consistency locking
  const subjectAnchor = extractSubjectAnchor(payload.title);

  // 4. Process each scene
  const qualityLog = [];

  const enhancedScenes = payload.scenes.map((scene, idx) => {
    const ctx = {
      sceneIndex:   idx,
      totalScenes,
      title:        payload.title,
      subjectAnchor,
    };

    // 4a. Enhance narration
    const narrationResult = enhanceNarration(scene.narration, stylePack, ctx);

    // 4b. Enhance image prompt
    const promptResult = enhanceImagePrompt(scene.image_prompt, stylePack, ctx);

    const sceneLog = {
      scene:              scene.scene,
      narration_changes:  narrationResult.changes,
      prompt_changes:     promptResult.changes,
      negative_hint:      promptResult.negativeHint,
    };
    qualityLog.push(sceneLog);

    if (verbose) {
      console.log(`  Scene ${scene.scene}:`, sceneLog);
    }

    return {
      scene:            scene.scene,
      duration_seconds: scene.duration_seconds,
      narration:        narrationResult.enhanced,
      image_prompt:     promptResult.enhanced,
      // negative_hint kept separate — image factory can choose to use it
      _negative_hint:   promptResult.negativeHint,
    };
  });

  // 5. Build quality metadata
  const quality_meta = {
    processed_at:   new Date().toISOString(),
    engine_version: '1.0.0',
    channel:        channelKey,
    style_pack:     stylePack.name,
    total_scenes:   totalScenes,
    duration_ms:    Date.now() - startTime,
    subject_anchor: subjectAnchor,
    scene_log:      qualityLog,
  };

  // 6. Return enhanced payload (same shape + quality_meta)
  return {
    script_id:    payload.script_id,
    title:        payload.title,
    channel:      channelKey,
    scenes:       enhancedScenes,
    quality_meta,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  runQualityEngine,
  listChannels,   // convenience re-export
};
