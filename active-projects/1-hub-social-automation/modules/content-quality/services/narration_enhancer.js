'use strict';

// ─── Narration Enhancer ──────────────────────────────────────────────────────
// Transforms raw narration text using channel style pack rules.
// Pure text transformation — no external calls, no I/O.

/**
 * Strip forbidden words from a sentence, replacing with style-appropriate alternatives.
 * @param {string} text
 * @param {string[]} forbiddenWords
 * @returns {string}
 */
function removeForbiddenWords(text, forbiddenWords) {
  if (!forbiddenWords || forbiddenWords.length === 0) return text;
  let result = text;
  forbiddenWords.forEach((word) => {
    // Match whole word, case-insensitive
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
    result = result.replace(regex, '');
  });
  // Clean up double spaces left behind
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

/**
 * Enforce sentence length. Sentences over max_words are split at natural break points.
 * @param {string} text
 * @param {number} maxWords
 * @returns {string}
 */
function enforceSentenceLength(text, maxWords) {
  if (!maxWords || maxWords <= 0) return text;

  const sentences = splitIntoSentences(text);
  const result = [];

  sentences.forEach((sentence) => {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= maxWords) {
      result.push(sentence.trim());
    } else {
      // Split at conjunction or punctuation near midpoint
      const chunks = splitLongSentence(words, maxWords);
      result.push(...chunks);
    }
  });

  return result.join(' ');
}

/**
 * Split a long array of words into chunks of ~maxWords at natural break points.
 * @param {string[]} words
 * @param {number} maxWords
 * @returns {string[]}
 */
function splitLongSentence(words, maxWords) {
  const CONJUNCTIONS = new Set(['and', 'but', 'or', 'so', 'yet', 'because', 'while', 'when', 'as', 'if', 'that', 'which']);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    let end = Math.min(start + maxWords, words.length);

    // Try to find a conjunction near the end to break on
    if (end < words.length) {
      for (let i = end - 1; i > start + Math.floor(maxWords / 2); i--) {
        if (CONJUNCTIONS.has(words[i].toLowerCase())) {
          end = i; // break before conjunction
          break;
        }
      }
    }

    const chunk = words.slice(start, end).join(' ').trim();
    if (chunk) chunks.push(capitalise(chunk) + (chunk.endsWith('.') ? '' : '.'));
    start = end;
  }

  return chunks;
}

/**
 * Apply power-word injection: if none of the style's power words appear in the
 * narration, append the most contextually appropriate one to the first sentence.
 * Does NOT force-inject; only adds if text is "cold" on power vocabulary.
 * @param {string} text
 * @param {string[]} powerWords
 * @returns {string}
 */
function injectPowerWords(text, powerWords) {
  if (!powerWords || powerWords.length === 0) return text;

  const lower = text.toLowerCase();
  const hasAny = powerWords.some((w) => lower.includes(w.toLowerCase()));
  if (hasAny) return text; // already has power vocabulary

  // Pick the first power word and weave into narration opener
  const chosen = powerWords[0];
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return text;

  // Insert after the first few words of sentence 1
  const firstWords = sentences[0].trim().split(/\s+/);
  const insertAt = Math.min(3, firstWords.length - 1);
  firstWords.splice(insertAt, 0, chosen);
  sentences[0] = firstWords.join(' ');

  return sentences.join(' ');
}

/**
 * Apply scene-level pacing adjustments based on style.
 * "punchy" → break into shorter sentences; "conversational" → soften; "balanced" → no-op
 * @param {string} text
 * @param {string} style  "short-punchy" | "conversational" | "balanced"
 * @returns {string}
 */
function applyPacingStyle(text, style) {
  if (!style || style === 'balanced') return text;

  if (style === 'short-punchy') {
    // Ensure each sentence ends with a hard stop, not ellipsis
    return text
      .replace(/\.\.\./g, '.')
      .replace(/,\s+/g, '. ')
      .trim();
  }

  if (style === 'conversational') {
    // Replace hard stops mid-sentence with commas where sentence is short
    const sentences = splitIntoSentences(text);
    if (sentences.length <= 2) return text;
    // Join with comma where second sentence is short
    const merged = [];
    let i = 0;
    while (i < sentences.length) {
      const cur = sentences[i].trim();
      const next = sentences[i + 1] ? sentences[i + 1].trim() : null;
      if (next && next.split(/\s+/).length < 5) {
        merged.push(cur.replace(/\.$/, '') + ', ' + lowerFirst(next));
        i += 2;
      } else {
        merged.push(cur);
        i++;
      }
    }
    return merged.join(' ');
  }

  return text;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Enhance a single narration string using the given style pack's narration rules.
 *
 * @param {string} narration   Raw narration text
 * @param {object} stylePack   Full style pack object (from style_pack_service)
 * @param {object} [ctx]       Optional context: { sceneIndex, totalScenes, title }
 * @returns {{ enhanced: string, changes: string[] }}
 */
function enhanceNarration(narration, stylePack, ctx = {}) {
  if (!narration || typeof narration !== 'string') {
    return { enhanced: narration, changes: [] };
  }

  const rules = (stylePack && stylePack.narration) || {};
  const changes = [];
  let text = narration.trim();

  // 1. Remove forbidden words
  if (rules.forbidden_words && rules.forbidden_words.length > 0) {
    const before = text;
    text = removeForbiddenWords(text, rules.forbidden_words);
    if (text !== before) changes.push('removed_forbidden_words');
  }

  // 2. Enforce sentence length
  if (rules.sentence_max_words) {
    const before = text;
    text = enforceSentenceLength(text, rules.sentence_max_words);
    if (text !== before) changes.push('enforced_sentence_length');
  }

  // 3. Inject power words if missing
  if (rules.power_words && rules.power_words.length > 0) {
    const before = text;
    text = injectPowerWords(text, rules.power_words);
    if (text !== before) changes.push('injected_power_word');
  }

  // 4. Apply pacing / sentence style
  if (rules.sentence_style) {
    const before = text;
    text = applyPacingStyle(text, rules.sentence_style);
    if (text !== before) changes.push('applied_pacing_style');
  }

  // 5. Capitalise first letter as a final pass
  text = capitalise(text);

  return { enhanced: text, changes };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitIntoSentences(text) {
  // Split on ". " or "! " or "? " — keep trailing punctuation
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function capitalise(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { enhanceNarration };
