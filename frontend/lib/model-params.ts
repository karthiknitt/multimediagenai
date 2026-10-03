/**
 * Single source of truth for the tunable parameters of every generation model.
 *
 * Each registry entry drives (1) the UI control (components/generation/ParamControls),
 * (2) the zod validation used by the API routes and forms, and (3) the snake_case
 * `parameters` payload sent to the Modal apps. Add a param here and all three follow.
 *
 * Research notes (what each model actually accepts) live in docs/model-parameters.md.
 * A `default` of `undefined` means "auto": the param is omitted and the model decides.
 */
import { z } from "zod";

export type ParamKind = "slider" | "number" | "switch" | "select" | "text" | "textarea" | "seed";

export interface SizePreset {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

export interface ParamDef {
  key: string;
  label: string;
  kind: ParamKind;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** value must be a multiple of this (e.g. 16 for image/video sizes) */
  multipleOf?: number;
  /** value must be min + k*step (e.g. Wan frame counts 4k+1) */
  strictStep?: boolean;
  default?: number | boolean | string;
  options?: readonly { readonly value: string; readonly label: string }[];
  maxLength?: number;
  placeholder?: string;
  unit?: string;
  /** shown inside the collapsible "Advanced" section */
  advanced?: boolean;
  /** optional sub-heading inside a section */
  group?: string;
  /** size presets, rendered as quick buttons under the `width` control */
  presets?: readonly SizePreset[];
  /** override of the snake_case key sent to Modal */
  modalKey?: string;
  /** hide the control unless this returns true for the current form values */
  when?: (values: Record<string, unknown>) => boolean;
}

type Valued<D> = D extends { kind: "slider" | "number" | "seed" }
  ? number
  : D extends { kind: "switch" }
    ? boolean
    : D extends { kind: "select"; options: readonly { value: infer V }[] }
      ? V
      : string;

/** Validated (output) values for a registry: params with a default are required. */
export type ParamValues<Defs extends readonly ParamDef[]> = {
  [D in Defs[number] as D extends { default: unknown } ? D["key"] : never]-?: Valued<D>;
} & {
  [D in Defs[number] as D extends { default: unknown } ? never : D["key"]]?: Valued<D>;
};

/** Form (input) values: everything optional because defaults fill the gaps. */
export type ParamInput<Defs extends readonly ParamDef[]> = {
  [D in Defs[number] as D["key"]]?: Valued<D>;
};

const AUTO = "auto";

// ---------------------------------------------------------------- Image (Z-Image-Turbo)
// Distilled 8-step model: guidance is fixed to 0 (negative prompts / CFG have no effect),
// so the real knobs are size, step count and seed.
export const IMAGE_PARAMS = [
  {
    key: "width",
    label: "Width",
    kind: "slider",
    min: 256,
    max: 2048,
    step: 64,
    multipleOf: 16,
    default: 1024,
    unit: "px",
    presets: [
      { label: "1:1", width: 1024, height: 1024 },
      { label: "4:3", width: 1152, height: 896 },
      { label: "3:4", width: 896, height: 1152 },
      { label: "3:2", width: 1216, height: 832 },
      { label: "2:3", width: 832, height: 1216 },
      { label: "16:9", width: 1344, height: 768 },
      { label: "9:16", width: 768, height: 1344 },
      { label: "4K □", width: 2048, height: 2048 },
    ],
  },
  {
    key: "height",
    label: "Height",
    kind: "slider",
    min: 256,
    max: 2048,
    step: 64,
    multipleOf: 16,
    default: 1024,
    unit: "px",
  },
  {
    key: "steps",
    label: "Steps",
    kind: "slider",
    min: 1,
    max: 12,
    step: 1,
    integer: true,
    default: 9,
    help: "Turbo is distilled: 9 steps = 8 model passes is optimal. More rarely helps.",
  },
  {
    key: "seed",
    label: "Seed",
    kind: "seed",
    advanced: true,
    help: "Same seed + prompt + size reproduces the image. Empty = random.",
  },
] as const satisfies readonly ParamDef[];

// ---------------------------------------------------------------- Video (Wan2.2 A14B)
const isT2V = (v: Record<string, unknown>) => v.variant !== "img2video";

export const VIDEO_PARAMS = [
  {
    key: "width",
    label: "Width",
    kind: "slider",
    min: 256,
    max: 1280,
    step: 32,
    multipleOf: 16,
    default: 832,
    unit: "px",
    help: "480p ≈ 832×480, 720p ≈ 1280×720 (slower, more memory). Image-to-video keeps the source aspect ratio and uses width×height as the pixel budget.",
    presets: [
      { label: "480p 16:9", width: 832, height: 480 },
      { label: "480p 9:16", width: 480, height: 832 },
      { label: "Square", width: 640, height: 640 },
      { label: "720p 16:9", width: 1280, height: 720 },
      { label: "720p 9:16", width: 720, height: 1280 },
    ],
  },
  {
    key: "height",
    label: "Height",
    kind: "slider",
    min: 256,
    max: 1280,
    step: 32,
    multipleOf: 16,
    default: 480,
    unit: "px",
  },
  {
    key: "numFrames",
    label: "Frames",
    kind: "slider",
    min: 5,
    max: 121,
    step: 4,
    integer: true,
    strictStep: true,
    default: 81,
    help: "Must be 4k+1. 81 frames ≈ 5 s at 16 fps; longer = slower.",
  },
  {
    key: "steps",
    label: "Steps",
    kind: "slider",
    min: 10,
    max: 60,
    step: 1,
    integer: true,
    default: 40,
    help: "Denoising steps. 40 is the model-card default; fewer is faster, lower quality.",
  },
  {
    key: "cfgScale",
    label: "Guidance (high-noise expert)",
    kind: "slider",
    min: 1,
    max: 10,
    step: 0.5,
    default: 4,
    help: "Prompt adherence for the first (layout) stage. Model card: 4.0 for text-to-video, 3.5 for image-to-video.",
  },
  {
    key: "cfgScale2",
    label: "Guidance (low-noise expert)",
    kind: "slider",
    min: 1,
    max: 10,
    step: 0.5,
    default: 3,
    advanced: true,
    modalKey: "cfg_scale_2",
    help: "Prompt adherence for the second (detail) stage. Model card: 3.0.",
  },
  {
    key: "fps",
    label: "Playback FPS",
    kind: "slider",
    min: 8,
    max: 30,
    step: 1,
    integer: true,
    default: 16,
    advanced: true,
    help: "Wan2.2 is trained at 16 fps. Changing this only speeds up / slows down playback.",
  },
  {
    key: "negativePrompt",
    label: "Negative prompt",
    kind: "textarea",
    advanced: true,
    maxLength: 1000,
    placeholder: "Empty = Wan's recommended negative prompt",
    help: "Things to avoid. Leave empty to use the model's built-in default.",
    modalKey: "negative_prompt",
  },
  { key: "seed", label: "Seed", kind: "seed", advanced: true, help: "Empty = random." },
] as const satisfies readonly ParamDef[];

// ---------------------------------------------------------------- Music (ACE-Step 1.5 turbo)
const LANGS = [
  "en",
  "zh",
  "yue",
  "ja",
  "ko",
  "hi",
  "ta",
  "te",
  "bn",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
  "ar",
  "tr",
  "vi",
  "th",
  "id",
  "nl",
  "pl",
  "uk",
  "sv",
  "fa",
  "he",
];

function languageLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const KEY_NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export const MUSIC_PARAMS = [
  {
    key: "duration",
    label: "Duration",
    kind: "slider",
    min: 10,
    max: 240,
    step: 5,
    integer: true,
    default: 30,
    unit: "s",
    help: "Target length (model supports 10–600 s; capped at 240 s here for the 10-minute request limit).",
  },
  {
    key: "lyrics",
    label: "Lyrics",
    kind: "textarea",
    maxLength: 4000,
    placeholder: "[verse]\nLine one…\n[chorus]\n…",
    help: "Optional. Structure tags like [verse] / [chorus] are understood. Empty = instrumental.",
  },
  {
    key: "instrumental",
    label: "Force instrumental",
    kind: "switch",
    default: false,
    help: "Ignore the lyrics and generate an instrumental.",
  },
  {
    key: "vocalLanguage",
    label: "Vocal language",
    kind: "select",
    default: "unknown",
    options: [
      { value: "unknown", label: "Auto-detect" },
      ...LANGS.map((c) => ({ value: c, label: languageLabel(c) })),
    ],
    advanced: true,
    modalKey: "vocal_language",
  },
  {
    key: "bpm",
    label: "BPM",
    kind: "number",
    min: 30,
    max: 300,
    integer: true,
    advanced: true,
    placeholder: "Auto",
    help: "Tempo, 30–300. Empty = the model chooses.",
  },
  {
    key: "keyscale",
    label: "Key / scale",
    kind: "select",
    default: AUTO,
    options: [
      { value: AUTO, label: "Auto" },
      ...KEY_NOTES.flatMap((n) => [
        { value: `${n} major`, label: `${n} major` },
        { value: `${n} minor`, label: `${n} minor` },
      ]),
    ],
    advanced: true,
  },
  {
    key: "timeSignature",
    label: "Time signature",
    kind: "select",
    default: AUTO,
    options: [
      { value: AUTO, label: "Auto" },
      { value: "2", label: "2/4" },
      { value: "3", label: "3/4" },
      { value: "4", label: "4/4" },
      { value: "6", label: "6/8" },
    ],
    advanced: true,
    modalKey: "time_signature",
  },
  { key: "seed", label: "Seed", kind: "seed", advanced: true, help: "Empty = random." },
  {
    key: "shift",
    label: "Timestep shift",
    kind: "slider",
    min: 1,
    max: 5,
    step: 0.5,
    default: 1,
    advanced: true,
    group: "Sampler",
    help: "Re-weights the diffusion timesteps. 1.0 = none; higher gives more structure-first generations.",
  },
  {
    key: "inferMethod",
    label: "Sampler",
    kind: "select",
    default: "ode",
    options: [
      { value: "ode", label: "ODE (deterministic)" },
      { value: "sde", label: "SDE (stochastic)" },
    ],
    advanced: true,
    group: "Sampler",
    modalKey: "infer_method",
  },
  {
    key: "thinking",
    label: "LM planner",
    kind: "switch",
    default: true,
    advanced: true,
    group: "5Hz language-model planner",
    help: "Let the 5Hz language model plan the song (structure, metadata) before synthesis. Slower, usually better.",
  },
  {
    key: "lmTemperature",
    label: "Planner temperature",
    kind: "slider",
    min: 0,
    max: 2,
    step: 0.05,
    default: 0.85,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
    help: "Higher = more varied / creative plans.",
  },
  {
    key: "lmTopK",
    label: "Planner top-k",
    kind: "slider",
    min: 0,
    max: 200,
    step: 1,
    integer: true,
    default: 0,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
    help: "0 = disabled.",
  },
  {
    key: "lmTopP",
    label: "Planner top-p",
    kind: "slider",
    min: 0.1,
    max: 1,
    step: 0.05,
    default: 0.9,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
  },
  {
    key: "lmCfgScale",
    label: "Planner guidance",
    kind: "slider",
    min: 1,
    max: 5,
    step: 0.1,
    default: 2,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
  },
  {
    key: "useCotMetas",
    label: "Planner picks BPM/key",
    kind: "switch",
    default: true,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
    modalKey: "use_cot_metas",
  },
  {
    key: "useCotCaption",
    label: "Planner rewrites caption",
    kind: "switch",
    default: true,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
    modalKey: "use_cot_caption",
  },
  {
    key: "useCotLanguage",
    label: "Planner detects language",
    kind: "switch",
    default: true,
    advanced: true,
    group: "5Hz language-model planner",
    when: (v) => v.thinking !== false,
    modalKey: "use_cot_language",
  },
  {
    key: "enableNormalization",
    label: "Normalize loudness",
    kind: "switch",
    default: true,
    advanced: true,
    group: "Output",
    modalKey: "enable_normalization",
  },
  {
    key: "fadeIn",
    label: "Fade in",
    kind: "slider",
    min: 0,
    max: 10,
    step: 0.5,
    default: 0,
    unit: "s",
    advanced: true,
    group: "Output",
    modalKey: "fade_in_duration",
  },
  {
    key: "fadeOut",
    label: "Fade out",
    kind: "slider",
    min: 0,
    max: 10,
    step: 0.5,
    default: 0,
    unit: "s",
    advanced: true,
    group: "Output",
    modalKey: "fade_out_duration",
  },
] as const satisfies readonly ParamDef[];

// ---------------------------------------------------------------- Speech (Qwen3-TTS)
const isPreset = (v: Record<string, unknown>) => v.voicePreset !== "custom";

export const TTS_PARAMS = [
  {
    key: "speed",
    label: "Speed",
    kind: "slider",
    min: 0.5,
    max: 2,
    step: 0.1,
    default: 1,
    unit: "×",
    help: "Qwen3-TTS has no native speed control: the audio is time-stretched after generation.",
  },
  {
    key: "instruct",
    label: "Style instruction",
    kind: "textarea",
    maxLength: 300,
    placeholder: "e.g. speak slowly and warmly, with a gentle smile",
    help: "Natural-language delivery / emotion instruction. Works with the built-in voices.",
    when: isPreset,
  },
  {
    key: "referenceText",
    label: "Reference transcript",
    kind: "textarea",
    maxLength: 500,
    placeholder: "Exact words spoken in the reference clip",
    help: "Optional. Giving the transcript of the reference clip clones the voice more faithfully (in-context mode).",
    when: (v) => !isPreset(v),
    modalKey: "reference_text",
  },
  { key: "seed", label: "Seed", kind: "seed", advanced: true, help: "Empty = random." },
  {
    key: "temperature",
    label: "Temperature",
    kind: "slider",
    min: 0.1,
    max: 1.5,
    step: 0.05,
    default: 0.9,
    advanced: true,
    group: "Sampling",
    help: "Higher = more expressive and varied, lower = more stable.",
  },
  {
    key: "topK",
    label: "Top-k",
    kind: "slider",
    min: 0,
    max: 200,
    step: 1,
    integer: true,
    default: 50,
    advanced: true,
    group: "Sampling",
    help: "0 = disabled.",
  },
  {
    key: "topP",
    label: "Top-p",
    kind: "slider",
    min: 0.1,
    max: 1,
    step: 0.05,
    default: 1,
    advanced: true,
    group: "Sampling",
  },
  {
    key: "repetitionPenalty",
    label: "Repetition penalty",
    kind: "slider",
    min: 1,
    max: 2,
    step: 0.05,
    default: 1.05,
    advanced: true,
    group: "Sampling",
    help: "Raise if the voice stutters or loops.",
  },
  {
    key: "subtalkerTemperature",
    label: "Sub-talker temperature",
    kind: "slider",
    min: 0.1,
    max: 1.5,
    step: 0.05,
    default: 0.9,
    advanced: true,
    group: "Sampling",
    help: "Temperature of the residual codec stage (fine acoustic detail).",
  },
] as const satisfies readonly ParamDef[];

// ---------------------------------------------------------------- helpers

/** `cfgScale2` -> `cfg_scale_2`, `lmTopK` -> `lm_top_k` */
export function toSnake(key: string): string {
  return key.replace(/([a-z])(\d)/g, "$1_$2").replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
}

export function defaultsFor(defs: readonly ParamDef[]): Record<string, number | boolean | string> {
  const out: Record<string, number | boolean | string> = {};
  for (const d of defs) {
    if (d.default !== undefined) out[d.key] = d.default;
  }
  return out;
}

function numberSchema(d: ParamDef) {
  let s = z.number();
  if (d.integer) s = s.int();
  if (d.min !== undefined) s = s.min(d.min);
  if (d.max !== undefined) s = s.max(d.max);
  if (d.multipleOf) s = s.multipleOf(d.multipleOf);
  const min = d.min ?? 0;
  const step = d.step ?? 1;
  const strict = d.strictStep
    ? s.refine((v) => (v - min) % step === 0, { message: `Must be ${min} + a multiple of ${step}` })
    : s;
  return strict;
}

/** Build the zod object for one model's params (defaults applied, unknown keys stripped). */
export function schemaFromDefs<const D extends readonly ParamDef[]>(
  defs: D,
): z.ZodType<ParamValues<D>, ParamInput<D>> {
  const shape: Record<string, z.ZodType> = {};
  for (const d of defs) {
    switch (d.kind) {
      case "slider":
      case "number": {
        const n = numberSchema(d);
        shape[d.key] = d.default === undefined ? n.optional() : n.default(d.default as number);
        break;
      }
      case "seed":
        shape[d.key] = z.number().int().min(0).max(2_147_483_647).optional();
        break;
      case "switch":
        shape[d.key] = z.boolean().default((d.default as boolean | undefined) ?? false);
        break;
      case "select": {
        const values = (d.options ?? []).map((o) => o.value) as [string, ...string[]];
        shape[d.key] = z.enum(values).default((d.default as string | undefined) ?? values[0]);
        break;
      }
      case "text":
      case "textarea":
        shape[d.key] = z
          .string()
          .max(d.maxLength ?? 2000)
          .optional();
        break;
    }
  }
  return z.object(shape) as unknown as z.ZodType<ParamValues<D>, ParamInput<D>>;
}

/**
 * Turn validated form values into the snake_case `parameters` object for Modal.
 * Only registry keys are emitted; unset / "auto" / empty values are omitted so the
 * model falls back to its own default.
 */
export function toModalParams(defs: readonly ParamDef[], values: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) {
    const v = (values as Record<string, unknown>)[d.key];
    if (v === undefined || v === null || v === "" || v === AUTO) continue;
    out[d.modalKey ?? toSnake(d.key)] = v;
  }
  return out;
}
