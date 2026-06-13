/**
 * Transition Generator
 * Creates FFmpeg transition filters between scenes
 */

'use strict';

/**
 * Available transition types
 */
const TRANSITION_TYPES = {
  FADE: 'fade',
  CROSSFADE: 'crossfade',
  DISSOLVE: 'dissolve',
  WIPE_LEFT: 'wipeleft',
  WIPE_RIGHT: 'wiperight',
  SLIDE_UP: 'slideup',
  SLIDE_DOWN: 'slidedown'
};

/**
 * Generate fade transition filter
 * @param {Object} options - Fade options
 * @param {number} options.duration - Total scene duration in seconds
 * @param {number} options.fadeInDuration - Fade in duration (default: 0.5)
 * @param {number} options.fadeOutDuration - Fade out duration (default: 0.5)
 * @returns {string} FFmpeg filter string
 */
function generateFadeFilter(options) {
  const {
    duration,
    fadeInDuration = 0.5,
    fadeOutDuration = 0.5
  } = options;

  const fadeOutStart = Math.max(0, duration - fadeOutDuration);
  const fadeIn = `fade=t=in:st=0:d=${fadeInDuration}`;
  const fadeOut = `fade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`;

  return `${fadeIn},${fadeOut}`;
}

/**
 * Generate crossfade transition for scene concatenation
 * @param {Object} options - Crossfade options
 * @param {number} options.offset - Offset timestamp for transition
 * @param {number} options.duration - Crossfade duration (default: 0.5)
 * @returns {string} FFmpeg xfade filter string
 */
function generateCrossfadeFilter(options) {
  const {
    offset,
    duration = 0.5
  } = options;

  return `xfade=transition=fade:duration=${duration}:offset=${offset}`;
}

/**
 * Generate xfade transition between two inputs
 * @param {Object} options - Xfade options
 * @param {string} options.type - Transition type (see TRANSITION_TYPES)
 * @param {number} options.offset - Offset timestamp for transition start
 * @param {number} options.duration - Transition duration in seconds
 * @returns {string} FFmpeg xfade filter string
 */
function generateXfadeFilter(options) {
  const {
    type,
    offset,
    duration = 1.0
  } = options;

  const validTransitions = ['fade', 'dissolve', 'wipeleft', 'wiperight', 'slideup', 'slidedown', 'circleopen', 'circleclose'];
  const safeType = validTransitions.includes(type) ? type : 'fade';

  return `xfade=transition=${safeType}:duration=${duration}:offset=${offset}`;
}

/**
 * Generate multiple transitions for scene sequence
 * @param {Array<Object>} scenes - Array of scene objects with duration
 * @param {string} transitionType - Transition type to use
 * @returns {Array<string>} Array of filter strings
 */
function generateSceneTransitions(scenes, transitionType = 'fade') {
  if (!scenes || scenes.length < 2) return [];

  const filters = [];
  let accumulatedTime = 0;

  for (let i = 0; i < scenes.length - 1; i++) {
    const currentScene = scenes[i];
    const transitionDuration = 0.5;
    const offset = accumulatedTime + currentScene.duration - transitionDuration;

    filters.push(
      generateXfadeFilter({
        type: transitionType,
        offset: offset,
        duration: transitionDuration
      })
    );

    accumulatedTime += currentScene.duration - transitionDuration;
  }

  return filters;
}

/**
 * Prepare fade chain for single scene
 * @param {number} sceneDuration - Scene duration in seconds
 * @param {number} [fadeInMs] - Fade in milliseconds
 * @param {number} [fadeOutMs] - Fade out milliseconds
 * @returns {string} FFmpeg filter string
 */
function prepareSceneFade(sceneDuration, fadeInMs = 500, fadeOutMs = 500) {
  const fadeIn = fadeInMs / 100;
  const fadeOut = fadeOutMs / 100;
  const fadeOutStart = Math.max(0, sceneDuration - fadeOut);

  return `fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${fadeOutStart}:d=${fadeOut}`;
}

/**
 * Create complex filter for scene with transitions
 * @param {Object} config - Transition config
 * @param {number} config.sceneIndex - Index of current scene
 * @param {number} config.totalScenes - Total number of scenes
 * @param {number} config.duration - Scene duration
 * @param {Object} config.transition - Transition settings
 * @returns {string} FFmpeg filter string
 */
function createSceneTransitionFilter(config) {
  const { sceneIndex, totalScenes, duration, transition = {} } = config;
  const {
    type = 'fade',
    duration: transDuration = 0.5
  } = transition;

  const filters = [];

  // First scene: only fade in
  if (sceneIndex === 0) {
    filters.push(`fade=t=in:st=0:d=${transDuration}`);
    if (totalScenes > 1) {
      filters.push(`fade=t=out:st=${duration - transDuration}:d=${transDuration}`);
    }
  }
  // Last scene: only fade out
  else if (sceneIndex === totalScenes - 1) {
    filters.push(`fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - transDuration}:d=${transDuration}`);
  }
  // Middle scenes: crossfade both sides
  else {
    filters.push(`fade=t=in:st=0:d=${transDuration}`);
    filters.push(`fade=t=out:st=${duration - transDuration}:d=${transDuration}`);
  }

  return filters.join(',');
}

module.exports = {
  TRANSITION_TYPES,
  generateFadeFilter,
  generateCrossfadeFilter,
  generateXfadeFilter,
  generateSceneTransitions,
  prepareSceneFade,
  createSceneTransitionFilter
};
