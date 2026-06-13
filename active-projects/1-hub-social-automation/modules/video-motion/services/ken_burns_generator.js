/**
 * Ken Burns Effect Generator
 * Creates FFmpeg zoom filters for cinematic motion
 */

'use strict';

/**
 * Generate Ken Burns zoom filter
 * @param {Object} options - Ken Burns configuration
 * @param {number} options.duration - Duration in seconds
 * @param {string} options.direction - 'in' or 'out'
 * @param {number} options.intensity - Zoom intensity (0.01-0.5)
 * @param {string} [options.easeCurve] - Easing function name
 * @param {number} [options.width] - Output video width
 * @param {number} [options.height] - Output video height
 * @returns {string} FFmpeg filter string
 */
function generateKenBurnsFilter(options) {
  const {
    duration,
    direction,
    intensity,
    easeCurve = 'linear',
    width = 1920,
    height = 1080
  } = options;

  const safeIntensity = Math.max(0.01, Math.min(0.5, intensity));

  let filter = '';

  if (direction === 'in') {
    // Zoom in: start at 1+intensity, end at 1.0
    const startScale = (1 + safeIntensity);
    const endScale = 1.0;
    filter = buildZoomFilter(duration, startScale, endScale, width, height, easeCurve);
  } else if (direction === 'out') {
    // Zoom out: start at 1.0, end at 1+intensity
    const startScale = 1.0;
    const endScale = (1 + safeIntensity);
    filter = buildZoomFilter(duration, startScale, endScale, width, height, easeCurve);
  }

  return filter;
}

/**
 * Build zoom filter with optional easing
 * @param {number} duration - Duration in seconds
 * @param {number} startScale - Starting scale factor
 * @param {number} endScale - Ending scale factor
 * @param {number} width - Video width
 * @param {number} height - Video height
 * @param {string} easeCurve - Easing function
 * @returns {string} FFmpeg filter string
 */
function buildZoomFilter(duration, startScale, endScale, width, height, easeCurve) {
  const fps = 30;
  const frames = Math.ceil(duration * fps);

  // Use zoompan filter for Ken Burns effect
  // z: zoom factor (start value)
  // d: duration in frames
  // x, y: pan position (centered)
  // s: output size

  const x = `(iw-iw/zoom)/2`;
  const y = `(ih-ih/zoom)/2`;

  // Calculate zoom trajectory
  let zoomExpr;
  if (easeCurve === 'linear') {
    zoomExpr = `${startScale}+(${endScale}-${startScale})*on/${frames}`;
  } else {
    // For non-linear easing, approximate with zoompan's linear interpolation
    // More complex curves would require custom expressions
    zoomExpr = `${startScale}+(${endScale}-${startScale})*on/${frames}`;
  }

  // zoompan filter: z='zoom', x='x', y='y', d=duration_frames, s=size
  const filter = `zoompan=z='${zoomExpr}':x='${x}':y='${y}':d=${frames}:s=${width}x${height}:fps=${fps}`;

  return filter;
}

/**
 * Generate zoom with center focus
 * @param {Object} options - Focus zoom options
 * @param {number} options.duration - Duration in seconds
 * @param {number} options.intensity - Zoom intensity
 * @param {string} options.focusPoint - 'center', 'left', 'right', 'top', 'bottom'
 * @returns {string} FFmpeg filter string
 */
function generateFocusZoomFilter(options) {
  const {
    duration,
    intensity,
    focusPoint = 'center',
    width = 1920,
    height = 1080
  } = options;

  const safeIntensity = Math.max(0.01, Math.min(0.3, intensity));
  const fps = 30;
  const frames = Math.ceil(duration * fps);

  // Determine pan direction based on focus point
  let xExpr, yExpr;
  const startScale = 1 + safeIntensity;
  const endScale = 1.0;

  switch (focusPoint) {
    case 'left':
      xExpr = `min(iw-iw/zoom, (iw-iw/zoom))`;
      yExpr = `(ih-ih/zoom)/2`;
      break;
    case 'right':
      xExpr = `max(0, (iw-iw/zoom))`;
      yExpr = `(ih-ih/zoom)/2`;
      break;
    case 'top':
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `0`;
      break;
    case 'bottom':
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `max(0, (ih-ih/zoom))`;
      break;
    case 'center':
    default:
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `(ih-ih/zoom)/2`;
  }

  const zoomExpr = `${startScale}+(${endScale}-${startScale})*on/${frames}`;

  return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${fps}`;
}

module.exports = {
  generateKenBurnsFilter,
  generateFocusZoomFilter,
  buildZoomFilter
};
