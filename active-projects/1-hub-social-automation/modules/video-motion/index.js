/**
 * Video Motion Module
 * Transforms static image slideshow videos into cinematic videos
 * with Ken Burns effects, camera pan, and transitions
 */

'use strict';

const motionEngine = require('./services/motion_engine');
const kenBurnsGenerator = require('./services/ken_burns_generator');
const transitionGenerator = require('./services/transition_generator');

/**
 * Apply motion to a scene
 * @param {Object} input - Scene input configuration
 * @param {string} input.script_id - Script identifier
 * @param {number} input.scene - Scene number
 * @param {string} input.imagePath - Path to image file
 * @param {number} input.duration_seconds - Duration in seconds
 * @param {string} input.motionPreset - Motion preset name (suspense, documentary, dramatic, calm, action, reveal)
 * @param {string} [input.transitionPreset] - Transition preset name (fade, crossfade, dissolve)
 * @param {number} [input.width=1920] - Output video width
 * @param {number} [input.height=1080] - Output video height
 * @returns {Object} Processing result with ffmpeg filter
 */
function applyMotion(input) {
  return motionEngine.processSceneMotion(input);
}

/**
 * Generate complete FFmpeg command for scene
 * @param {Object} sceneInput - Scene input configuration
 * @param {string} outputPath - Output file path
 * @returns {string} Complete FFmpeg command
 */
function generateFFmpegCommand(sceneInput, outputPath) {
  return motionEngine.generateFFmpegCommand(sceneInput, outputPath);
}

/**
 * Get available motion presets
 * @returns {Array<string>} List of preset names
 */
function getMotionPresets() {
  return motionEngine.listMotionPresets();
}

/**
 * Get available transition presets
 * @returns {Array<string>} List of transition names
 */
function getTransitionPresets() {
  return motionEngine.listTransitionPresets();
}

/**
 * Get specific motion preset configuration
 * @param {string} presetName - Name of the preset
 * @returns {Object|null} Preset configuration or null if not found
 */
function getMotionPreset(presetName) {
  return motionEngine.getPreset(presetName);
}

module.exports = {
  applyMotion,
  generateFFmpegCommand,
  getMotionPresets,
  getTransitionPresets,
  getMotionPreset,
  motionEngine,
  kenBurnsGenerator,
  transitionGenerator
};
