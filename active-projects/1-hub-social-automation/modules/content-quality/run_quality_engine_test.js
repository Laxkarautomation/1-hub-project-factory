'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  modules/content-quality/run_quality_engine_test.js
//
//  Standalone smoke test. Run with:
//    node modules/content-quality/run_quality_engine_test.js
//
//  No test framework required. Exits 0 on pass, 1 on failure.
// ─────────────────────────────────────────────────────────────────────────────

const { runQualityEngine, listChannels } = require('./index');

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(C.green('  ✓') + ' ' + label);
    passed++;
  } else {
    console.log(C.red('  ✗') + ' ' + label);
    failed++;
  }
}

function section(title) {
  console.log('\n' + C.bold(C.cyan(`── ${title} `)) + C.cyan('─'.repeat(50 - title.length)));
}

// ─── Sample payload ───────────────────────────────────────────────────────────

const SAMPLE_PAYLOAD = {
  script_id: 'research_script_001',
  title:     'The Hidden Truth About Dark Money',
  channel:   'UNRAAZ',
  scenes: [
    {
      scene:            1,
      duration_seconds: 5,
      narration:        'This is basically a very shocking story about some stuff that got hidden from the public.',
      image_prompt:     'A bright cheerful office with people smiling and flat lay design.',
    },
    {
      scene:            2,
      duration_seconds: 7,
      narration:        'The really powerful men who control the system actually never wanted you to find out about these things and what happened next will actually change how you see everything.',
      image_prompt:     'Men in suits walking down a corridor in a very minimalist white environment.',
    },
    {
      scene:            3,
      duration_seconds: 6,
      narration:        'Now the truth is out. No one can stop what is coming.',
      image_prompt:     'A dramatic wide shot of a city at night with dark shadows and cinematic composition.',
    },
  ],
};

// ─── Test 1: Channel listing ──────────────────────────────────────────────────
section('Test 1: Channel listing');
const channels = listChannels();
assert(Array.isArray(channels), 'listChannels() returns an array');
assert(channels.includes('UNRAAZ'), 'UNRAAZ channel is registered');
assert(channels.includes('DEFAULT'), 'DEFAULT channel is registered');
console.log(C.dim(`  Available channels: ${channels.join(', ')}`));

// ─── Test 2: Payload validation ───────────────────────────────────────────────
section('Test 2: Payload validation');
try {
  runQualityEngine(null);
  assert(false, 'Should throw on null payload');
} catch (e) {
  assert(e.message.includes('[ContentQuality]'), 'Throws with [ContentQuality] prefix on null');
}
try {
  runQualityEngine({ script_id: 'x', title: 'y', scenes: [] });
  assert(false, 'Should throw on empty scenes');
} catch (e) {
  assert(e.message.includes('scenes'), 'Throws on empty scenes array');
}

// ─── Test 3: UNRAAZ pipeline ─────────────────────────────────────────────────
section('Test 3: UNRAAZ quality pipeline');
const result = runQualityEngine(SAMPLE_PAYLOAD, { verbose: true });

assert(result.script_id === 'research_script_001', 'script_id preserved');
assert(result.title     === SAMPLE_PAYLOAD.title,  'title preserved');
assert(result.channel   === 'UNRAAZ',              'channel resolved to UNRAAZ');
assert(Array.isArray(result.scenes),               'scenes is array');
assert(result.scenes.length === 3,                 'all 3 scenes returned');

// Narration checks
const scene1 = result.scenes[0];
assert(typeof scene1.narration === 'string',         'scene 1 narration is string');
assert(scene1.narration.length > 0,                  'scene 1 narration is non-empty');
assert(!scene1.narration.includes('basically'),      'scene 1: "basically" removed');
assert(!scene1.narration.includes('really'),         'scene 1: "really" removed');

// Image prompt checks
assert(typeof scene1.image_prompt === 'string',      'scene 1 image_prompt is string');
assert(!scene1.image_prompt.toLowerCase().includes('bright cheerful'), 'scene 1: forbidden "bright" removed');
assert(scene1.image_prompt.toLowerCase().includes('cinematic'),         'scene 1: "cinematic" injected');

const scene3 = result.scenes[2];
assert(scene3.image_prompt.toLowerCase().includes('dark cinematic'),    'scene 3: color grade lock applied');

// Metadata
assert(typeof result.quality_meta === 'object',      'quality_meta present');
assert(result.quality_meta.engine_version === '1.0.0', 'engine_version in meta');
assert(result.quality_meta.total_scenes === 3,         'total_scenes in meta');
assert(typeof result.quality_meta.duration_ms === 'number', 'duration_ms in meta');

// ─── Test 4: DEFAULT channel fallback ────────────────────────────────────────
section('Test 4: DEFAULT channel fallback');
const defaultPayload = { ...SAMPLE_PAYLOAD, channel: 'NONEXISTENT_CHANNEL_XYZ' };
const defaultResult = runQualityEngine(defaultPayload);
assert(defaultResult.quality_meta.style_pack === 'DEFAULT', 'Falls back to DEFAULT style pack');

// ─── Test 5: BRIGHTFLOW channel ───────────────────────────────────────────────
section('Test 5: BRIGHTFLOW channel');
const brightPayload = {
  ...SAMPLE_PAYLOAD,
  channel: 'BRIGHTFLOW',
  scenes: [
    {
      scene:            1,
      duration_seconds: 5,
      narration:        'This terrifying brutal dark secret was forbidden from the public.',
      image_prompt:     'Dark gloomy shadowy room with harsh contrast.',
    },
  ],
};
const brightResult = runQualityEngine(brightPayload);
const bScene = brightResult.scenes[0];
assert(!bScene.narration.toLowerCase().includes('terrifying'), 'BRIGHTFLOW: "terrifying" removed');
assert(!bScene.narration.toLowerCase().includes('brutal'),     'BRIGHTFLOW: "brutal" removed');
assert(!bScene.image_prompt.toLowerCase().includes('gloomy'),  'BRIGHTFLOW: "gloomy" removed from prompt');
assert(bScene.image_prompt.toLowerCase().includes('vibrant') ||
       bScene.image_prompt.toLowerCase().includes('bright'),   'BRIGHTFLOW: bright qualifier injected');

// ─── Test 6: _negative_hint present ─────────────────────────────────────────
section('Test 6: Negative prompt hint output');
const hasNegHint = result.scenes.some((s) => typeof s._negative_hint === 'string');
assert(hasNegHint, 'At least one scene has _negative_hint string');
assert(result.scenes[0]._negative_hint.includes('--no'), '_negative_hint contains "--no" prefix');

// ─── Test 7: Output shape matches integration contract ───────────────────────
section('Test 7: Output shape — integration contract');
const requiredSceneFields = ['scene', 'duration_seconds', 'narration', 'image_prompt'];
result.scenes.forEach((s, i) => {
  requiredSceneFields.forEach((field) => {
    assert(Object.prototype.hasOwnProperty.call(s, field),
      `scenes[${i}].${field} present in output`);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
const status = failed === 0
  ? C.green(`✓ ALL ${passed} TESTS PASSED`)
  : C.red(`✗ ${failed} FAILED / ${passed} PASSED`);
console.log(C.bold(status));
console.log('');

if (failed > 0) {
  process.exit(1);
}
