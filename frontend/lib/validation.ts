import { z } from "zod";

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

// Image generation validation schemas
export const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .min(3, "Prompt must be at least 3 characters")
    .max(2000, "Prompt must be less than 2000 characters"),
  model: z.enum(["z-image-turbo"]).default("z-image-turbo"),
  // Z-Image-Turbo is a distilled 8-step model; guidance is fixed to 0 on the backend
  steps: z.number().min(1).max(12).default(9),
  cfgScale: z.number().min(0).max(20).default(0),
  width: z.number().min(256).max(2048).default(1024),
  height: z.number().min(256).max(2048).default(1024),
  seed: z.number().optional(),
  negativePrompt: z.string().max(2000).optional(),
});

// Video generation validation schemas
export const videoGenerationSchema = z.object({
  prompt: z
    .string()
    .min(3, "Prompt must be at least 3 characters")
    .max(2000, "Prompt must be less than 2000 characters"),
  variant: z.enum(["text2video", "img2video"]),
  numFrames: z.number().min(5).max(121).default(81), // Wan2.2: 16 fps, 81 frames = ~5s (backend snaps to 4k+1)
  cfgScale: z.number().min(1).max(20).default(4.0), // Wan2.2 T2V: 4.0, I2V: 3.5
  seed: z.number().optional(),
  sourceImageUrl: z.union([z.string().url(), z.undefined()]).optional(), // Required for img2video variant
});

// Audio generation validation schemas
export const audioGenerationSchema = z
  .object({
    // Common field
    variant: z.enum(["music", "tts"]),

    // ACE-Step fields (music variant)
    prompt: z
      .string()
      .min(3, "Prompt must be at least 3 characters")
      .max(2000, "Prompt must be less than 2000 characters")
      .optional(),
    duration: z.number().min(10).max(60).default(30),
    guidanceScale: z.number().min(1).max(20).default(3.0),

    // Qwen3-TTS fields (tts variant)
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
    speed: z.number().min(0.5).max(2.0).default(1.0),
  })
  .refine(
    (data) => {
      // For music variant, prompt is required
      if (data.variant === "music" && !data.prompt) {
        return false;
      }
      // For TTS variant, text is required
      if (data.variant === "tts" && !data.text) {
        return false;
      }
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

// Newsletter validation
export const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
