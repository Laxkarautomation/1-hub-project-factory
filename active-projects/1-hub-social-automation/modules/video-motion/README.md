# Video Motion Module

Transforms static image slideshow videos into cinematic videos with Ken Burns effects, camera pan, and transitions.

## Features

- **Ken Burns Effect**: Slow zoom in/out for cinematic feel
- **Camera Pan**: Left, right, top, bottom pan movements
- **Motion Presets**: Pre-configured animations (suspense, documentary, dramatic, calm, action, reveal)
- **Transition Presets**: Fade, crossfade, dissolve
- **Config Driven**: JSON-based preset configuration

## Installation

```bash
# No npm packages required - pure CommonJS
```

## Usage

### Basic Usage

```javascript
const videoMotion = require('./modules/video-motion');

const result = videoMotion.applyMotion({
  script_id: 'fresh_script_001',
  scene: 1,
  imagePath: '/path/image.jpg',
  duration_seconds: 6,
  motionPreset: 'suspense'
});

console.log(result.ffmpegFilter);
```

### With Transition

```javascript
const result = videoMotion.applyMotion({
  script_id: 'fresh_script_001',
  scene: 1,
  imagePath: '/path/image.jpg',
  duration_seconds: 6,
  motionPreset: 'dramatic',
  transitionPreset: 'fade'
});
```

### Generate FFmpeg Command

```javascript
const command = videoMotion.generateFFmpegCommand(input, '/output/scene.mp4');
// Returns: ffmpeg -loop 1 -i "...", -c:v libx264 -t 6 -filter_complex "..." ...
```

## API

### `applyMotion(input)`

Process scene with motion preset.

**Input:**
- `script_id` (string): Script identifier
- `scene` (number): Scene number
- `imagePath` (string): Path to image file
- `duration_seconds` (number): Duration in seconds
- `motionPreset` (string): Preset name
- `transitionPreset` (string, optional): Transition name
- `width` (number, optional): Output width (default: 1920)
- `height` (number, optional): Output height (default: 1080)

**Output:**
```json
{
  "script_id": "fresh_script_001",
  "scene": 1,
  "imagePath": "/path/image.jpg",
  "ffmpegFilter": "zoompan=z='...':x='...':y='...':d=180:s=1920x1080:fps=30",
  "preset": "suspense",
  "duration": 6
}
```

### `getMotionPresets()`

Returns array of available motion preset names.

### `getTransitionPresets()`

Returns array of available transition preset names.

### `getMotionPreset(presetName)`

Returns configuration for specific preset.

## Motion Presets

| Preset | Effect | Description |
|--------|--------|-------------|
| suspense | Zoom in + left pan | Builds tension |
| documentary | Zoom out + right pan | Establishing shots |
| dramatic | Aggressive zoom in | Emotional impact |
| calm | Gentle zoom out + up pan | Peaceful scenes |
| action | Fast zoom + right pan | Dynamic energy |
| reveal | Zoom out | Reveal full context |

## Transition Presets

| Preset | Description |
|--------|-------------|
| fade | Simple fade in/out |
| crossfade | Smooth crossfade between scenes |
| dissolve | Gradual dissolve transition |

## File Structure

```
modules/video-motion/
├── index.js                    # Main entry point
├── services/
│   ├── motion_engine.js        # Core motion orchestrator
│   ├── ken_burns_generator.js  # Ken Burns zoom effects
│   └── transition_generator.js # Transition filters
├── config/
│   └── motion_presets.json     # Preset configurations
├── run_motion_test.js          # Test runner
└── README.md                   # Documentation
```

## FFmpeg Compatibility

Output filters are compatible with FFmpeg's `zoompan` and `fade` filters.

Example output:
```
zoompan=z='1.08-0.08*on/180':x='min((iw-iw/zoom)/2, (iw-iw/zoom)/2+288*on/180)':y='(ih-ih/zoom)/2':d=180:s=1920x1080:fps=30,fade=t=in:st=0:d=0.5,fade=t=out:st=5.5:d=0.5
```

## Customization

Edit `config/motion_presets.json` to add or modify presets:

```json
{
  "motionPresets": {
    "custom": {
      "kenBurns": {
        "type": "zoom",
        "direction": "in",
        "intensity": 0.1
      },
      "pan": {
        "enabled": true,
        "direction": "right",
        "distance": 0.2
      }
    }
  }
}
```
