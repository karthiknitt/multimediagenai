import { z } from "zod";
import {
  IMAGE_PARAMS,
  MUSIC_PARAMS,
  schemaFromDefs,
  TTS_PARAMS,
  VIDEO_PARAMS,
} from "./model-params";

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Model parameter shapes come from the registry in lib/model-params.ts (single source of truth
// for UI controls, validation bounds and the Modal payload).
const imageParams = schemaFromDefs(IMAGE_PARAMS);
const videoParams = schemaFromDefs(VIDEO_PARAMS);
const musicParams = schemaFromDefs(MUSIC_PARAMS);
const ttsParams = schemaFromDefs(TTS_PARAMS);

const promptSchema = z
  .string()
  .min(3, "Prompt must be at least 3 characters")
  .max(2000, "Prompt must be less than 2000 characters");

// Image generation (Z-Image-Turbo)
export const imageGenerationSchema = z.intersection(
  z.object({
    prompt: promptSchema,
    model: z.enum(["z-image-turbo"]).default("z-image-turbo"),
  }),
  imageParams,
);

// Video generation (Wan2.2 T2V / I2V)
export const videoGenerationSchema = z.intersection(
  z.object({
    prompt: promptSchema,
    variant: z.enum(["text2video", "img2video"]),
    sourceImageUrl: z.union([z.string().url(), z.undefined()]).optional(), // required for img2video
  }),
  videoParams,
);

// Audio generation: music (ACE-Step 1.5) or text-to-speech (Qwen3-TTS)
export const audioGenerationSchema = z
  .intersection(
    z.object({
      variant: z.enum(["music", "tts"]),
      prompt: promptSchema.optional(),
      text: z
        .string()
        .min(3, "Text must be at least 3 characters")
        .max(500, "Text must be less than 500 characters for optimal results")
        .optional(),
      voicePreset: z
        .enum([
          "ryan",
          "aiden",
          "vivian",
          "serena",
          "uncle_fu",
          "dylan",
          "eric",
          "ono_anna",
          "sohee",
          "custom",
        ])
        .default("ryan"),
      voiceReferenceUrl: z.union([z.string().url(), z.undefined()]).optional(),
      language: z.enum(["en", "zh", "ja", "ko", "de", "fr", "ru", "pt", "es", "it"]).default("en"),
    }),
    z.intersection(musicParams, ttsParams),
  )
  .refine(
    (data) => {
      if (data.variant === "music" && !data.prompt) return false;
      if (data.variant === "tts" && !data.text) return false;
      return true;
    },
    {
      message: "Music variant requires prompt, TTS variant requires text",
      path: ["prompt"],
    },
  );

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>;
export type AudioGenerationInput = z.infer<typeof audioGenerationSchema>;
// What the forms hold / the API accepts: defaults are filled in server-side
export type ImageGenerationRequest = z.input<typeof imageGenerationSchema>;
export type VideoGenerationRequest = z.input<typeof videoGenerationSchema>;
export type AudioGenerationRequest = z.input<typeof audioGenerationSchema>;

// Newsletter validation
export const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
