/**
 * Motion Engine
 * Orchestrates motion effects combining Ken Burns, pan, and transitions
 */

'use strict';

const path = require('path');
const fs = require('fs');
const kenBurnsGenerator = require('./ken_burns_generator');
const transitionGenerator = require('./transition_generator');

let presetsConfig = null;

function loadPresets() {
  if (presetsConfig) return presetsConfig;

  const configPath = path.join(__dirname, '..', 'config', 'motion_presets.json');
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    presetsConfig = JSON.parse(configData);
    return presetsConfig;
  } catch (error) {
    console.error('Failed to load motion presets:', error.message);
    return getDefaultPresets();
  }
}

function getDefaultPresets() {
  return {
    motionPresets: {
      suspense: {
        kenBurns: { type: 'zoom', direction: 'in', intensity: 0.08 },
        pan: { enabled: true, direction: 'left', distance: 0.15 }
      },
      documentary: {
        kenBurns: { type: 'zoom', direction: 'out', intensity: 0.12 },
        pan: { enabled: true, direction: 'right', distance: 0.2 }
      },
      dramatic: {
        kenBurns: { type: 'zoom', direction: 'in', intensity: 0.15 },
        pan: { enabled: false }
      }
    },
    transitionPresets: {
      fade: { type: 'fade', duration: 1.0 },
      crossfade: { type: 'crossfade', duration: 1.5 }
    }
  };
}

function generatePanFilter(panConfig, duration, width = 1920, height = 1080) {
  const { direction, distance } = panConfig;
  const safeDist = Math.max(0, Math.min(0.5, distance || 0.15));
  const panPixels = safeDist * width;
  const fps = 30;
  const frames = Math.ceil(duration * fps);

  let xExpr = `(iw-iw/zoom)/2`;
  let yExpr = `(ih-ih/zoom)/2`;

  switch (direction) {
    case 'left':
      xExpr = `min((iw-iw/zoom)/2, (iw-iw/zoom)/2+${panPixels}*on/${frames})`;
      break;
    case 'right':
      xExpr = `max((iw-iw/zoom)/2-${panPixels}*on/${frames}, 0)`;
      break;
    case 'top':
      yExpr = `max((ih-ih/zoom)/2-${panPixels}*on/${frames}, 0)`;
      break;
    case 'bottom':
      yExpr = `min((ih-ih/zoom)/2, (ih-ih/zoom)/2+${panPixels}*on/${frames})`;
      break;
  }

  return { xExpr, yExpr };
}

function generateCombinedMotionFilter(config) {
  const {
    duration,
    kenBurns,
    pan,
    width = 1920,
    height = 1080
  } = config;

  const fps = 30;
  const frames = Math.ceil(duration * fps);

  const direction = kenBurns.direction || 'in';
  const intensity = kenBurns.intensity || 0.1;

  let startScale, endScale;
  if (direction === 'in') {
    startScale = 1 + intensity;
    endScale = 1.0;
  } else {
    startScale = 1.0;
    endScale = 1 + intensity;
  }

  let xExpr = `(iw-iw/zoom)/2`;
  let yExpr = `(ih-ih/zoom)/2`;

  if (pan && pan.enabled) {
    const panResult = generatePanFilter(pan, duration, width, height);
    xExpr = panResult.xExpr;
    yExpr = panResult.yExpr;
  }

  const zoomExpr = `${startScale}+(${endScale}-${startScale})*on/${frames}`;

  return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${fps}`;
}

function processSceneMotion(input) {
  const {
    script_id,
    scene,
    imagePath,
    duration_seconds,
    motionPreset,
    transitionPreset,
    width = 1920,
    height = 1080
  } = input;

  const presets = loadPresets();
  const motionConfig = presets.motionPresets[motionPreset];

  if (!motionConfig) {
    return {
      script_id,
      scene,
      imagePath,
      ffmpegFilter: basicMotionFilter(duration_seconds, width, height),
      preset: 'default',
      error: `Preset '${motionPreset}' not found`
    };
  }

  const motionFilter = generateCombinedMotionFilter({
    duration: duration_seconds,
    kenBurns: motionConfig.kenBurns,
    pan: motionConfig.pan,
    width,
    height
  });

  let fullFilter = motionFilter;
  if (transitionPreset && presets.transitionPresets[transitionPreset]) {
    const fadeFilter = transitionGenerator.generateFadeFilter({
      duration: duration_seconds,
      fadeInDuration: 0.5,
      fadeOutDuration: 0.5
    });
    fullFilter = `${motionFilter},${fadeFilter}`;
  }

  return {
    script_id,
    scene,
    imagePath,
    ffmpegFilter: fullFilter,
    preset: motionPreset,
    motionConfig,
    duration: duration_seconds
  };
}

function basicMotionFilter(duration, width = 1920, height = 1080) {
  const fps = 30;
  const frames = Math.ceil(duration * fps);

  return `zoompan=z='1.1-0.1*on/${frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${width}x${height}:fps=${fps}`;
}

function generateFFmpegCommand(sceneInput, outputPath) {
  const result = processSceneMotion(sceneInput);
  const { ffmpegFilter } = result;

  return `ffmpeg -loop 1 -i "${sceneInput.imagePath}" -c:v libx264 -t ${sceneInput.duration_seconds} -filter_complex "${ffmpegFilter}" -pix_fmt yuv420p "${outputPath}"`;
}

function listMotionPresets() {
  const presets = loadPresets();
  return Object.keys(presets.motionPresets);
}

function listTransitionPresets() {
  const presets = loadPresets();
  return Object.keys(presets.transitionPresets);
}

function getPreset(presetName) {
  const presets = loadPresets();
  return presets.motionPresets[presetName] || null;
}

module.exports = {
  processSceneMotion,
  generateCombinedMotionFilter,
  generatePanFilter,
  generateFFmpegCommand,
  basicMotionFilter,
  listMotionPresets,
  listTransitionPresets,
  getPreset,
  loadPresets
};
