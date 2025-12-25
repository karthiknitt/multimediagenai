import { inngest } from "./client";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";

// Event types
interface GenerationRequestedEvent {
  data: {
    jobId: string;
    userId: string;
    type: "image" | "video" | "audio";
    prompt: string;
    model?: string;
    // Image-specific
    steps?: number;
    cfgScale?: number;
    width?: number;
    height?: number;
    seed?: number;
    negativePrompt?: string;
    // Video-specific
    variant?: "text2video" | "img2video";
    duration?: number;
    fps?: number;
    motionStrength?: number;
    sourceImageUrl?: string;
    // Audio-specific
    temperature?: number;
  };
}

// Image generation function
export const generateImage = inngest.createFunction(
  {
    id: "generate-image",
    retries: 3,
  },
  { event: "generation/requested" },
  async ({ event, step }) => {
    const { jobId, type, prompt, model, steps, cfgScale, width, height, seed, negativePrompt } =
      event.data as GenerationRequestedEvent["data"];

    // Only handle image generation
    if (type !== "image") {
      return { skipped: true, reason: "Not an image generation request" };
    }

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await db
        .update(generations)
        .set({ status: "processing" })
        .where(eq(generations.id, jobId));
    });

    // Step 2: Call Modal API for generation
    const result = await step.run("call-modal-api", async () => {
      const modalApiUrl = process.env.MODAL_API_URL;

      if (!modalApiUrl) {
        throw new Error("MODAL_API_URL not configured");
      }

      const response = await fetch(`${modalApiUrl}/generate/image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: jobId,
          prompt,
          model: model || "flux2-dev",
          parameters: {
            steps: steps || 28,
            cfg_scale: cfgScale || 3.5,
            width: width || 1024,
            height: height || 1024,
            seed,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Modal API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    });

    // Step 3: Update database with result
    await step.run("update-database", async () => {
      await db
        .update(generations)
        .set({
          status: "completed",
          outputUrl: result.output_url,
          processingTimeMs: result.processing_time_ms,
          completedAt: new Date(),
        })
        .where(eq(generations.id, jobId));
    });

    // Step 4: Emit completion event
    await step.sendEvent("emit-completion", {
      name: "generation/completed",
      data: {
        jobId,
        type: "image",
        outputUrl: result.output_url,
      },
    });

    return {
      success: true,
      jobId,
      outputUrl: result.output_url,
    };
  }
);

// Video generation function
export const generateVideo = inngest.createFunction(
  {
    id: "generate-video",
    retries: 3,
  },
  { event: "generation/video-requested" },
  async ({ event, step }) => {
    const { jobId, type, prompt, model, variant, duration, fps, motionStrength, sourceImageUrl, seed } =
      event.data as GenerationRequestedEvent["data"];

    if (type !== "video") {
      return { skipped: true };
    }

    // Update status
    await step.run("update-status-processing", async () => {
      await db
        .update(generations)
        .set({ status: "processing" })
        .where(eq(generations.id, jobId));
    });

    // Call Modal API
    const result = await step.run("call-modal-api", async () => {
      const modalApiUrl = process.env.MODAL_API_URL;

      if (!modalApiUrl) {
        throw new Error("MODAL_API_URL not configured");
      }

      const endpoint = variant === "img2video" ? "/generate/video/img2video" : "/generate/video/text2video";

      const response = await fetch(`${modalApiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: jobId,
          prompt,
          model: model || "mochi",
          duration: duration || 5,
          fps: fps || 30,
          motion_strength: motionStrength || 5,
          source_image_url: sourceImageUrl,
          seed,
        }),
      });

      if (!response.ok) {
        throw new Error(`Modal API error: ${response.status}`);
      }

      return response.json();
    });

    // Update database
    await step.run("update-database", async () => {
      await db
        .update(generations)
        .set({
          status: "completed",
          outputUrl: result.output_url,
          processingTimeMs: result.processing_time_ms,
          completedAt: new Date(),
        })
        .where(eq(generations.id, jobId));
    });

    return { success: true, jobId, outputUrl: result.output_url };
  }
);

// Audio generation function
export const generateAudio = inngest.createFunction(
  {
    id: "generate-audio",
    retries: 3,
  },
  { event: "generation/audio-requested" },
  async ({ event, step }) => {
    const { jobId, type, prompt, duration, temperature } =
      event.data as GenerationRequestedEvent["data"];

    if (type !== "audio") {
      return { skipped: true };
    }

    // Update status
    await step.run("update-status-processing", async () => {
      await db
        .update(generations)
        .set({ status: "processing" })
        .where(eq(generations.id, jobId));
    });

    // Call Modal API
    const result = await step.run("call-modal-api", async () => {
      const modalApiUrl = process.env.MODAL_API_URL;

      if (!modalApiUrl) {
        throw new Error("MODAL_API_URL not configured");
      }

      const response = await fetch(`${modalApiUrl}/generate/audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: jobId,
          prompt,
          duration: duration || 30,
          temperature: temperature || 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Modal API error: ${response.status}`);
      }

      return response.json();
    });

    // Update database
    await step.run("update-database", async () => {
      await db
        .update(generations)
        .set({
          status: "completed",
          outputUrl: result.output_url,
          processingTimeMs: result.processing_time_ms,
          completedAt: new Date(),
        })
        .where(eq(generations.id, jobId));
    });

    return { success: true, jobId, outputUrl: result.output_url };
  }
);

// Error handler for failed generations
export const handleGenerationError = inngest.createFunction(
  { id: "handle-generation-error" },
  { event: "generation/failed" },
  async ({ event, step }) => {
    const { jobId, error } = event.data as { jobId: string; error: string };

    await step.run("update-status-failed", async () => {
      await db
        .update(generations)
        .set({
          status: "failed",
          error: error || "Unknown error",
        })
        .where(eq(generations.id, jobId));
    });

    return { handled: true, jobId };
  }
);
