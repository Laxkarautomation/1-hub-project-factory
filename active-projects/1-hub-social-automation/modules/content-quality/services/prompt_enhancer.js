'use strict';

// ─── Prompt Enhancer ─────────────────────────────────────────────────────────
// Transforms raw image prompts using channel visual style rules.
// Enforces consistency across all scenes in a script.
// Pure transformation — no external calls, no I/O.

/**
 * Inject required visual qualifiers into a prompt if not already present.
 * @param {string} prompt
 * @param {string[]} requiredQualifiers
 * @returns {string}
 */
function injectRequiredQualifiers(prompt, requiredQualifiers) {
  if (!requiredQualifiers || requiredQualifiers.length === 0) return prompt;

  const lower = prompt.toLowerCase();
  const missing = requiredQualifiers.filter(
    (q) => !lower.includes(q.toLowerCase())
  );

  if (missing.length === 0) return prompt;

  // Append missing qualifiers as a comma-separated suffix
  return `${prompt.trimEnd()}, ${missing.join(', ')}`;
}

/**
 * Strip forbidden style descriptors from a prompt.
 * @param {string} prompt
 * @param {string[]} forbiddenStyles
 * @returns {string}
 */
function removeForbiddenStyles(prompt, forbiddenStyles) {
  if (!forbiddenStyles || forbiddenStyles.length === 0) return prompt;

  let result = prompt;
  forbiddenStyles.forEach((style) => {
    const regex = new RegExp(`\\b${escapeRegex(style)}\\b`, 'gi');
    result = result.replace(regex, '');
  });

  // Clean up stray commas and double spaces
  result = result
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim();

  return result;
}

/**
 * Inject the channel's color palette and lighting into prompt if not described.
 * @param {string} prompt
 * @param {object} visualRules
 * @returns {string}
 */
function injectVisualMood(prompt, visualRules) {
  const lower = prompt.toLowerCase();
  const additions = [];

  if (visualRules.lighting && !lower.includes('light') && !lower.includes('shadow')) {
    additions.push(visualRules.lighting);
  }

  if (visualRules.color_palette && !lower.includes('color') && !lower.includes('palette') && !lower.includes('tone')) {
    additions.push(visualRules.color_palette);
  }

  if (visualRules.camera_style && !lower.includes('shot') && !lower.includes('angle') && !lower.includes('camera')) {
    additions.push(visualRules.camera_style);
  }

  if (additions.length === 0) return prompt;
  return `${prompt.trimEnd()}, ${additions.join(', ')}`;
}

/**
 * Apply visual consistency lock across all scenes.
 * Ensures scene prompts share a common anchor style phrase so image generators
 * produce visually cohesive frames.
 *
 * @param {string} prompt
 * @param {string} colorGradeLock   e.g. "dark_cinematic"
 * @param {number} sceneIndex
 * @returns {string}
 */
function applyConsistencyLock(prompt, colorGradeLock, sceneIndex) {
  const GRADE_TAGS = {
    dark_cinematic:   'dark cinematic color grade, film noir palette',
    warm_bright:      'warm bright color grade, golden hour tones',
    neutral:          'neutral color grade, balanced exposure',
  };

  const tag = GRADE_TAGS[colorGradeLock] || '';
  if (!tag) return prompt;

  const lower = prompt.toLowerCase();
  if (lower.includes(tag.split(',')[0].trim())) return prompt; // already present

  return `${prompt.trimEnd()}, ${tag}`;
}

/**
 * Build the negative prompt hint string from style pack.
 * @param {string[]} negativeHints
 * @returns {string}
 */
function buildNegativePromptSuffix(negativeHints) {
  if (!negativeHints || negativeHints.length === 0) return '';
  return ` --no ${negativeHints.join(', ')}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Enhance a single image prompt using the given style pack's visual rules.
 *
 * @param {string} imagePrompt   Raw image prompt
 * @param {object} stylePack     Full style pack object
 * @param {object} [ctx]         Optional context: { sceneIndex, totalScenes, title, subjectAnchor }
 * @returns {{ enhanced: string, negativeHint: string, changes: string[] }}
 */
function enhanceImagePrompt(imagePrompt, stylePack, ctx = {}) {
  if (!imagePrompt || typeof imagePrompt !== 'string') {
    return { enhanced: imagePrompt, negativeHint: '', changes: [] };
  }

  const visuals = (stylePack && stylePack.visuals) || {};
  const consistency = (stylePack && stylePack.consistency_rules) || {};
  const changes = [];
  let prompt = imagePrompt.trim();

  // 1. Remove forbidden style descriptors
  if (visuals.forbidden_styles && visuals.forbidden_styles.length > 0) {
    const before = prompt;
    prompt = removeForbiddenStyles(prompt, visuals.forbidden_styles);
    if (prompt !== before) changes.push('removed_forbidden_styles');
  }

  // 2. Inject required qualifiers (photorealistic, cinematic, etc.)
  if (visuals.required_qualifiers && visuals.required_qualifiers.length > 0) {
    const before = prompt;
    prompt = injectRequiredQualifiers(prompt, visuals.required_qualifiers);
    if (prompt !== before) changes.push('injected_required_qualifiers');
  }

  // 3. Inject visual mood (lighting, palette, camera style)
  const before3 = prompt;
  prompt = injectVisualMood(prompt, visuals);
  if (prompt !== before3) changes.push('injected_visual_mood');

  // 4. Apply consistency lock (color grade)
  if (consistency.color_grade_lock) {
    const before = prompt;
    prompt = applyConsistencyLock(prompt, consistency.color_grade_lock, ctx.sceneIndex || 0);
    if (prompt !== before) changes.push('applied_consistency_lock');
  }

  // 5. Subject anchor — prepend subject if subject_lock is true and a subjectAnchor is provided
  if (consistency.subject_lock && ctx.subjectAnchor) {
    const lower = prompt.toLowerCase();
    if (!lower.includes(ctx.subjectAnchor.toLowerCase())) {
      prompt = `${ctx.subjectAnchor}, ${prompt}`;
      changes.push('applied_subject_lock');
    }
  }

  // 6. Build negative hint (returned separately — caller decides whether to append)
  const negativeHint = buildNegativePromptSuffix(visuals.negative_prompt_hints);

  return { enhanced: prompt, negativeHint, changes };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { enhanceImagePrompt };
