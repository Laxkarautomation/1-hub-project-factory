/**
 * Motion Test Runner
 * Tests all motion presets and outputs FFmpeg filter strings
 */

'use strict';

const videoMotion = require('./index');

const testInputs = [
  {
    script_id: 'fresh_script_001',
    scene: 1,
    imagePath: '/path/to/scene1.jpg',
    duration_seconds: 6,
    motionPreset: 'suspense'
  },
  {
    script_id: 'fresh_script_001',
    scene: 2,
    imagePath: '/path/to/scene2.jpg',
    duration_seconds: 5,
    motionPreset: 'documentary'
  },
  {
    script_id: 'fresh_script_001',
    scene: 3,
    imagePath: '/path/to/scene3.jpg',
    duration_seconds: 4,
    motionPreset: 'dramatic'
  },
  {
    script_id: 'fresh_script_001',
    scene: 4,
    imagePath: '/path/to/scene4.jpg',
    duration_seconds: 6,
    motionPreset: 'calm'
  },
  {
    script_id: 'fresh_script_001',
    scene: 5,
    imagePath: '/path/to/scene5.jpg',
    duration_seconds: 5,
    motionPreset: 'action'
  },
  {
    script_id: 'fresh_script_001',
    scene: 6,
    imagePath: '/path/to/scene6.jpg',
    duration_seconds: 4,
    motionPreset: 'reveal',
    transitionPreset: 'fade'
  }
];

console.log('========================================');
console.log('Video Motion Module - Test Runner');
console.log('========================================\n');

console.log('Available Motion Presets:');
const motionPresets = videoMotion.getMotionPresets();
motionPresets.forEach(preset => {
  console.log(`  - ${preset}`);
});

console.log('\nAvailable Transition Presets:');
const transitionPresets = videoMotion.getTransitionPresets();
transitionPresets.forEach(preset => {
  console.log(`  - ${preset}`);
});

console.log('\n========================================');
console.log('Testing Scene Motion Processing');
console.log('========================================\n');

testInputs.forEach((input, index) => {
  console.log(`\n--- Scene ${input.scene}: ${input.motionPreset} ---`);
  console.log(`Duration: ${input.duration_seconds}s`);

  const result = videoMotion.applyMotion(input);

  console.log(`\nOutput:`);
  console.log(JSON.stringify({
    script_id: result.script_id,
    scene: result.scene,
    preset: result.preset,
    duration: result.duration
  }, null, 2));

  console.log(`\nFFmpeg Filter:`);
  console.log(result.ffmpegFilter);

  if (result.error) {
    console.log(`\nError: ${result.error}`);
  }

  console.log('\nFFmpeg Command:');
  console.log(videoMotion.generateFFmpegCommand(input, `/output/scene_${input.scene}.mp4`));
});

console.log('\n\n========================================');
console.log('Test Complete');
console.log('========================================');
