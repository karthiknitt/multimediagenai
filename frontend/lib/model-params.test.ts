import { describe, expect, test } from "bun:test";
import {
  defaultsFor,
  IMAGE_PARAMS,
  MUSIC_PARAMS,
  schemaFromDefs,
  TTS_PARAMS,
  toModalParams,
  VIDEO_PARAMS,
} from "./model-params";

const image = schemaFromDefs(IMAGE_PARAMS);
const video = schemaFromDefs(VIDEO_PARAMS);
const music = schemaFromDefs(MUSIC_PARAMS);
const tts = schemaFromDefs(TTS_PARAMS);

describe("defaults", () => {
  test("every schema parses an empty object into its defaults", () => {
    for (const [defs, schema] of [
      [IMAGE_PARAMS, image],
      [VIDEO_PARAMS, video],
      [MUSIC_PARAMS, music],
      [TTS_PARAMS, tts],
    ] as const) {
      const parsed = schema.parse({});
      expect(parsed).toEqual(expect.objectContaining(defaultsFor(defs)));
    }
  });

  test("known model defaults match the research", () => {
    expect(defaultsFor(IMAGE_PARAMS)).toMatchObject({ steps: 9, width: 1024, height: 1024 });
    expect(defaultsFor(VIDEO_PARAMS)).toMatchObject({ numFrames: 81, steps: 40, fps: 16 });
    expect(defaultsFor(TTS_PARAMS)).toMatchObject({
      temperature: 0.9,
      topK: 50,
      topP: 1,
      repetitionPenalty: 1.05,
    });
    expect(defaultsFor(MUSIC_PARAMS)).toMatchObject({ lmTemperature: 0.85, lmTopP: 0.9 });
  });
});

describe("validation", () => {
  test("rejects out-of-range numbers", () => {
    expect(image.safeParse({ steps: 0 }).success).toBe(false);
    expect(image.safeParse({ steps: 13 }).success).toBe(false);
    expect(video.safeParse({ numFrames: 200 }).success).toBe(false);
    expect(tts.safeParse({ topP: 1.5 }).success).toBe(false);
    expect(music.safeParse({ bpm: 10 }).success).toBe(false);
  });

  test("width/height must be multiples of 16", () => {
    expect(image.safeParse({ width: 1000 }).success).toBe(false);
    expect(image.safeParse({ width: 1008, height: 512 }).success).toBe(true);
    expect(video.safeParse({ width: 830 }).success).toBe(false);
  });

  test("frames must be 4k+1", () => {
    expect(video.safeParse({ numFrames: 81 }).success).toBe(true);
    expect(video.safeParse({ numFrames: 80 }).success).toBe(false);
  });

  test("selects only accept listed options", () => {
    expect(music.safeParse({ timeSignature: "5" }).success).toBe(false);
    expect(music.safeParse({ timeSignature: "3" }).success).toBe(true);
    expect(music.safeParse({ inferMethod: "foo" }).success).toBe(false);
  });

  test("strips unknown keys and caps text length", () => {
    expect(image.parse({ evil: 1 })).not.toHaveProperty("evil");
    expect(tts.safeParse({ instruct: "x".repeat(1000) }).success).toBe(false);
  });

  test("optional auto params stay undefined", () => {
    const m = music.parse({});
    expect(m.bpm).toBeUndefined();
    expect(m.seed).toBeUndefined();
  });
});

describe("toModalParams", () => {
  test("snake_cases keys and drops unset/auto/empty values", () => {
    const out = toModalParams(MUSIC_PARAMS, {
      ...music.parse({}),
      bpm: 120,
      keyscale: "auto",
      timeSignature: "4",
      lyrics: "",
      seed: undefined,
    });
    expect(out).toMatchObject({ bpm: 120, time_signature: "4", lm_temperature: 0.85 });
    expect(out).not.toHaveProperty("keyscale");
    expect(out).not.toHaveProperty("lyrics");
    expect(out).not.toHaveProperty("seed");
  });

  test("only emits keys that are in the registry", () => {
    const out = toModalParams(IMAGE_PARAMS, { ...image.parse({}), prompt: "x", userId: "y" });
    expect(Object.keys(out).sort()).toEqual(
      ["height", "seed", "steps", "width"].filter((k) => k in out).sort(),
    );
    expect(out).not.toHaveProperty("prompt");
  });

  test("video maps cfgScale->cfg_scale and cfgScale2->cfg_scale_2", () => {
    const out = toModalParams(VIDEO_PARAMS, video.parse({ cfgScale: 5, cfgScale2: 2.5 }));
    expect(out).toMatchObject({ cfg_scale: 5, cfg_scale_2: 2.5, num_frames: 81 });
  });
});
