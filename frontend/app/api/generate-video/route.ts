import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";

// Schema for video generation requests
const generateVideoRequestSchema = z.object({
  prompt: z.string().min(3).max(2000),
  variant: z.enum(["text2video", "img2video"]),
  numFrames: z.number().min(5).max(121).default(81),
  cfgScale: z.number().min(1).max(20).default(4.0),
  seed: z.number().optional(),
  sourceImageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to generate content" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = generateVideoRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Invalid request parameters",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Validate img2video requirements
    if (data.variant === "img2video" && !data.sourceImageUrl) {
      return NextResponse.json(
        { error: "Validation failed", message: "sourceImageUrl is required for img2video variant" },
        { status: 400 },
      );
    }

    // Create generation record in database
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: "video",
        model: data.variant === "text2video" ? "wan22-t2v" : "wan22-i2v",
        prompt: data.prompt,
        parameters: data,
        status: "pending",
      })
      .returning({ id: generations.id });

    const jobId = generation.id;

    // Get Modal API URLs for video generation
    const text2videoUrl = process.env.VIDEO_GEN_TEXT2VIDEO_API_URL;
    const img2videoUrl = process.env.VIDEO_GEN_IMG2VIDEO_API_URL;

    // Determine which Modal endpoint to use based on variant
    const endpoint = data.variant === "text2video" ? text2videoUrl : img2videoUrl;

    if (!endpoint) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: `Video generation API not configured for ${data.variant}`,
        },
        { status: 500 },
      );
    }

    // Update status to processing
    await db.update(generations).set({ status: "processing" }).where(eq(generations.id, jobId));

    const markFailed = async (message: string) => {
      await db
        .update(generations)
        .set({ status: "failed", error: message })
        .where(eq(generations.id, jobId))
        .catch(console.error);
    };

    // Call Modal API
    const modalPayload: Record<string, unknown> = {
      job_id: jobId,
      prompt: data.prompt,
      parameters: {
        num_frames: data.numFrames,
        cfg_scale: data.cfgScale,
        seed: data.seed,
      },
    };

    // Add image_url for img2video
    if (data.variant === "img2video" && data.sourceImageUrl) {
      modalPayload.image_url = data.sourceImageUrl;
    }

    // Fire and forget: Wan2.2 takes minutes and Modal answers long requests with
    // a 303 redirect, so we must not hold this request open. Modal writes progress and
    // the final status/output_url to the generations row itself; the UI polls that
    // row via /api/generation/[jobId]/stream and shows the video once it is completed.
    fetch(endpoint, {
      method: "POST",
      headers: modalHeaders(),
      body: JSON.stringify(modalPayload),
    })
      .then(async (modalResponse) => {
        if (!modalResponse.ok) {
          const errorText = await modalResponse.text();
          await markFailed(`Modal API error: ${errorText}`);
          return;
        }
        // Modal reports failures in a 200 body ({ status: "error" }) and updates the DB
        // itself, but make sure a missing DB update can never leave the job hanging.
        const result = await modalResponse.json().catch(() => null);
        if (result?.status === "error") {
          await markFailed(`Modal API error: ${result.message ?? "unknown error"}`);
        }
      })
      .catch(async (error: unknown) => {
        console.error("Modal video API call failed:", error);
        await markFailed(
          `Modal API error: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

    return NextResponse.json({
      jobId,
      message: "Video generation started",
      variant: data.variant,
      estimatedTime: "5-8 minutes",
    });
  } catch (error) {
    console.error("Video generation API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to start video generation. Please try again.",
      },
      { status: 500 },
    );
  }
}
