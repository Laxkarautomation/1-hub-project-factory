# modules/content-quality

**Content Quality Engine** — transforms raw script payloads into channel-styled, visually consistent content ready for the Image Factory.

---

## Pipeline Position

```
Script Generation
      ↓
Content Quality Engine  ← THIS MODULE
      ↓
Image Factory
      ↓
Audio Generation
      ↓
Video Rendering
```

---

## Integration Contract

### Input

```json
{
  "script_id": "research_script_001",
  "title": "The Hidden Truth About Dark Money",
  "channel": "UNRAAZ",
  "scenes": [
    {
      "scene": 1,
      "duration_seconds": 5,
      "narration": "Raw narration text here.",
      "image_prompt": "Raw image prompt here."
    }
  ]
}
```

> `channel` is optional. Defaults to `"DEFAULT"` if omitted or unknown.

### Output

Same shape, with enhanced fields:

```json
{
  "script_id": "research_script_001",
  "title": "The Hidden Truth About Dark Money",
  "channel": "UNRAAZ",
  "scenes": [
    {
      "scene": 1,
      "duration_seconds": 5,
      "narration": "Enhanced narration — channel-styled, power words injected.",
      "image_prompt": "Enhanced prompt, cinematic, dramatic lighting, dark cinematic color grade.",
      "_negative_hint": " --no blurry, low resolution, cartoonish, overexposed, flat lighting"
    }
  ],
  "quality_meta": {
    "processed_at": "2025-01-01T00:00:00.000Z",
    "engine_version": "1.0.0",
    "channel": "UNRAAZ",
    "style_pack": "UNRAAZ",
    "total_scenes": 1,
    "duration_ms": 3,
    "subject_anchor": "Hidden Truth Dark",
    "scene_log": [
      {
        "scene": 1,
        "narration_changes": ["removed_forbidden_words", "injected_power_word"],
        "prompt_changes": ["removed_forbidden_styles", "injected_required_qualifiers", "injected_visual_mood", "applied_consistency_lock"],
        "negative_hint": " --no blurry, low resolution, ..."
      }
    ]
  }
}
```

---

## Usage

```js
const { runQualityEngine } = require('./modules/content-quality');

const enhanced = runQualityEngine(scriptPayload, { verbose: true });
```

### Options

| Option    | Type    | Default | Description                     |
|-----------|---------|---------|---------------------------------|
| `verbose` | boolean | `false` | Log per-scene changes to stdout |

---

## File Structure

```
modules/content-quality/
├── index.js                        ← Entry point: runQualityEngine()
├── services/
│   ├── style_pack_service.js       ← Loads & resolves channel style packs
│   ├── narration_enhancer.js       ← Transforms narration text
│   └── prompt_enhancer.js          ← Transforms image prompts
├── config/
│   └── style_packs.json            ← Channel style pack definitions
├── run_quality_engine_test.js      ← Smoke test (no framework needed)
└── README.md
```

---

## Channels

| Channel     | Style             | Description                                    |
|-------------|-------------------|------------------------------------------------|
| `UNRAAZ`    | Dark / Cinematic  | High-drama, chiaroscuro, punchy narration      |
| `BRIGHTFLOW`| Bright / Clean    | Upbeat, educational, warm tones                |
| `DEFAULT`   | Neutral           | Balanced, general-purpose fallback             |

### Adding a New Channel

Edit `config/style_packs.json` and add a key under `"channels"`:

```json
{
  "channels": {
    "MY_CHANNEL": {
      "name": "MY_CHANNEL",
      "description": "...",
      "narration": {
        "tone": "...",
        "pacing": "...",
        "sentence_max_words": 20,
        "forbidden_words": [],
        "preferred_openers": [],
        "power_words": [],
        "sentence_style": "balanced"
      },
      "visuals": {
        "color_palette": "...",
        "lighting": "...",
        "camera_style": "...",
        "mood": "...",
        "forbidden_styles": [],
        "required_qualifiers": ["high quality", "photorealistic"],
        "aspect_ratio": "16:9",
        "negative_prompt_hints": ["blurry", "watermark"]
      },
      "consistency_rules": {
        "scene_transition": "visual_continuity",
        "subject_lock": true,
        "color_grade_lock": "neutral",
        "max_scene_style_drift": 0.2
      }
    }
  }
}
```

No code changes needed — the engine picks it up at runtime.

---

## Running Tests

```bash
node modules/content-quality/run_quality_engine_test.js
```

Exits `0` on pass, `1` on failure. No test framework required.

---

## What This Module Does NOT Do

- Does **not** call providers (Gemini, Cloudflare, etc.)
- Does **not** generate images, audio, or video
- Does **not** call admin APIs
- Does **not** write to disk or make network requests
- Does **not** require any npm packages beyond Node.js built-ins

---

## Design Principles

- **Config-driven**: all style rules live in `style_packs.json`
- **Provider-agnostic**: output is plain JSON; any image generator can consume it
- **Non-destructive**: preserves all original fields; only enhances `narration` and `image_prompt`
- **Multi-channel**: add channels via config, no code changes
- **Auditable**: `quality_meta.scene_log` records every transformation applied
