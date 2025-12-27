import { z } from "zod";

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
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
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Image generation validation schemas
export const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .min(3, "Prompt must be at least 3 characters")
    .max(2000, "Prompt must be less than 2000 characters"),
  model: z.enum(["flux1-dev", "flux2-dev", "flux2-schnell"]),
  steps: z.number().min(1).max(100).default(30),
  cfgScale: z.number().min(1).max(20).default(7),
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
  numFrames: z.number().min(1).max(162).default(64), // Mochi: 64 frames, CogVideoX: 49 frames
  cfgScale: z.number().min(1).max(20).default(7.5), // Mochi: 7.5, CogVideoX: 6.0
  seed: z.number().optional(),
  sourceImageUrl: z.union([z.string().url(), z.undefined()]).optional(), // Required for img2video variant
});

// Audio generation validation schemas
export const audioGenerationSchema = z.object({
  prompt: z
    .string()
    .min(3, "Prompt must be at least 3 characters")
    .max(1000, "Prompt must be less than 1000 characters"),
  duration: z.number().min(5).max(60).default(30),
  temperature: z.number().min(0.1).max(2).default(1),
});

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
