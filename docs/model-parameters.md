# Model parameters

Every tunable that can be passed alongside the prompt, per model. The **single source of truth is
`frontend/lib/model-params.ts`**: one `ParamDef[]` per model drives the UI controls
(`components/generation/ParamControls`), the zod validation (`schemaFromDefs`) and the snake_case
`parameters` payload sent to Modal (`toModalParams`). The Modal apps re-validate and clamp everything
(`parse_*_params` in each `backend/*-gen/main.py`, tested in `backend/tests/test_param_parsing.py`).
"auto" means the key is omitted and the backend default applies.

To add a parameter: add a `ParamDef`, then read it in the matching `parse_*_params`. Nothing else changes.

## What each model really exposes

- **Z-Image-Turbo** is a distilled model: guidance is fixed at 0 and ~8 steps is optimal, so the old
  negative-prompt and CFG controls were no-ops and were removed. Real knobs: size, steps, seed.
- **Wan2.2 A14B** is a two-expert MoE: `guidance_scale` drives the high-noise expert and
  `guidance_scale_2` the low-noise one. Frames must be 4k+1; native playback is 16 fps.
- **ACE-Step 1.5 turbo** runs a fixed 8 steps and ignores CFG (the old UI "guidance" slider was
  removed). Musical controls (bpm, key, time signature, language, lyrics) and the LM-planner sampling
  knobs are exposed; duration is capped at 240 s here.
- **Qwen3-TTS**: sampling controls (temperature, top-k/p, repetition penalty, sub-talker temperature),
  `instruct` style prompt (preset voices only), `ref_text` (in-context voice cloning with a custom
  reference), seed, and `speed` (post-hoc time-stretch, since the model has no native speed control).

## Reference

### Image — Z-Image-Turbo

| Modal key | UI label | Range / options | Default | Notes |
|---|---|---|---|---|
| `width` | Width | 256–2048 (step 64) | 1024 |  |
| `height` | Height | 256–2048 (step 64) | 1024 |  |
| `steps` | Steps | 1–12 (step 1) | 9 | Turbo is distilled: 9 steps = 8 model passes is optimal. More rarely helps. |
| `seed` | Seed *(advanced)* | seed | auto | Same seed + prompt + size reproduces the image. Empty = random. |

### Video — Wan2.2 T2V / I2V A14B

| Modal key | UI label | Range / options | Default | Notes |
|---|---|---|---|---|
| `width` | Width | 256–1280 (step 32) | 832 | 480p ≈ 832×480, 720p ≈ 1280×720 (slower, more memory). Image-to-video keeps the source aspect ratio and uses width×height as the pixel budget. |
| `height` | Height | 256–1280 (step 32) | 480 |  |
| `num_frames` | Frames | 5–121 (step 4) | 81 | Must be 4k+1. 81 frames ≈ 5 s at 16 fps; longer = slower. |
| `steps` | Steps | 10–60 (step 1) | 40 | Denoising steps. 40 is the model-card default; fewer is faster, lower quality. |
| `cfg_scale` | Guidance (high-noise expert) | 1–10 (step 0.5) | 4 | Prompt adherence for the first (layout) stage. Model card: 4.0 for text-to-video, 3.5 for image-to-video. |
| `cfg_scale_2` | Guidance (low-noise expert) *(advanced)* | 1–10 (step 0.5) | 3 | Prompt adherence for the second (detail) stage. Model card: 3.0. |
| `fps` | Playback FPS *(advanced)* | 8–30 (step 1) | 16 | Wan2.2 is trained at 16 fps. Changing this only speeds up / slows down playback. |
| `negative_prompt` | Negative prompt *(advanced)* | textarea | auto | Things to avoid. Leave empty to use the model's built-in default. |
| `seed` | Seed *(advanced)* | seed | auto | Empty = random. |

### Music — ACE-Step 1.5 turbo

| Modal key | UI label | Range / options | Default | Notes |
|---|---|---|---|---|
| `duration` | Duration | 10–240 (step 5) | 30 | Target length (model supports 10–600 s; capped at 240 s here for the 10-minute request limit). |
| `lyrics` | Lyrics | textarea | auto | Optional. Structure tags like [verse] / [chorus] are understood. Empty = instrumental. |
| `instrumental` | Force instrumental | switch | false | Ignore the lyrics and generate an instrumental. |
| `vocal_language` | Vocal language *(advanced)* | unknown / en / zh / yue / ja / ko / hi / ta / te / bn / es / fr / de / it / pt / ru / ar / tr / vi / th / id / nl / pl / uk / sv / fa / he | unknown |  |
| `bpm` | BPM *(advanced)* | 30–300 | auto | Tempo, 30–300. Empty = the model chooses. |
| `keyscale` | Key / scale *(advanced)* | auto / C major / C minor / C# major / C# minor / D major / D minor / Eb major / Eb minor / E major / E minor / F major / F minor / F# major / F# minor / G major / G minor / Ab major / Ab minor / A major / A minor / Bb major / Bb minor / B major / B minor | auto |  |
| `time_signature` | Time signature *(advanced)* | auto / 2 / 3 / 4 / 6 | auto |  |
| `seed` | Seed *(advanced)* | seed | auto | Empty = random. |
| `shift` | Timestep shift *(advanced)* | 1–5 (step 0.5) | 1 | Re-weights the diffusion timesteps. 1.0 = none; higher gives more structure-first generations. |
| `infer_method` | Sampler *(advanced)* | ode / sde | ode |  |
| `thinking` | LM planner *(advanced)* | switch | true | Let the 5Hz language model plan the song (structure, metadata) before synthesis. Slower, usually better. |
| `lm_temperature` | Planner temperature *(advanced)* | 0–2 (step 0.05) | 0.85 | Higher = more varied / creative plans. |
| `lm_top_k` | Planner top-k *(advanced)* | 0–200 (step 1) | 0 | 0 = disabled. |
| `lm_top_p` | Planner top-p *(advanced)* | 0.1–1 (step 0.05) | 0.9 |  |
| `lm_cfg_scale` | Planner guidance *(advanced)* | 1–5 (step 0.1) | 2 |  |
| `use_cot_metas` | Planner picks BPM/key *(advanced)* | switch | true |  |
| `use_cot_caption` | Planner rewrites caption *(advanced)* | switch | true |  |
| `use_cot_language` | Planner detects language *(advanced)* | switch | true |  |
| `enable_normalization` | Normalize loudness *(advanced)* | switch | true |  |
| `fade_in_duration` | Fade in *(advanced)* | 0–10 (step 0.5) | 0 |  |
| `fade_out_duration` | Fade out *(advanced)* | 0–10 (step 0.5) | 0 |  |

### Speech — Qwen3-TTS

| Modal key | UI label | Range / options | Default | Notes |
|---|---|---|---|---|
| `speed` | Speed | 0.5–2 (step 0.1) | 1 | Qwen3-TTS has no native speed control: the audio is time-stretched after generation. |
| `instruct` | Style instruction | textarea | auto | Natural-language delivery / emotion instruction. Works with the built-in voices. |
| `reference_text` | Reference transcript | textarea | auto | Optional. Giving the transcript of the reference clip clones the voice more faithfully (in-context mode). |
| `seed` | Seed *(advanced)* | seed | auto | Empty = random. |
| `temperature` | Temperature *(advanced)* | 0.1–1.5 (step 0.05) | 0.9 | Higher = more expressive and varied, lower = more stable. |
| `top_k` | Top-k *(advanced)* | 0–200 (step 1) | 50 | 0 = disabled. |
| `top_p` | Top-p *(advanced)* | 0.1–1 (step 0.05) | 1 |  |
| `repetition_penalty` | Repetition penalty *(advanced)* | 1–2 (step 0.05) | 1.05 | Raise if the voice stutters or loops. |
| `subtalker_temperature` | Sub-talker temperature *(advanced)* | 0.1–1.5 (step 0.05) | 0.9 | Temperature of the residual codec stage (fine acoustic detail). |

