import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";

// Schema for image generation requests
const generateRequestSchema = z.object({
  prompt: z.string().min(3).max(2000),
  model: z.enum(["flux1-dev", "flux2-dev", "flux2-schnell"]).default("flux2-dev"),
  steps: z.number().min(1).max(100).default(28),
  cfgScale: z.number().min(1).max(20).default(4.0),
  width: z.number().min(256).max(2048).default(1024),
  height: z.number().min(256).max(2048).default(1024),
  seed: z.number().optional(),
  negativePrompt: z.string().max(2000).optional(),
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
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = generateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Invalid request parameters",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create generation record in database
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: "image",
        model: data.model,
        prompt: data.prompt,
        parameters: data,
        status: "pending",
      })
      .returning({ id: generations.id });

    const jobId = generation.id;

    // Determine which Modal endpoint to use based on model
    let modalApiUrl: string | undefined;
    if (data.model === "flux1-dev") {
      modalApiUrl = process.env.FLUX1_API_URL;
    } else if (data.model === "flux2-dev" || data.model === "flux2-schnell") {
      modalApiUrl = process.env.FLUX2_API_URL;
    }

    if (!modalApiUrl) {
      return NextResponse.json(
        { error: "Configuration error", message: `Modal API not configured for model: ${data.model}` },
        { status: 500 }
      );
    }

    // Update status to processing
    await db
      .update(generations)
      .set({ status: "processing" })
      .where(eq(generations.id, jobId));

    // Call Modal API (this spawns async task)
    // Note: Modal API expects snake_case parameters
    const modalResponse = await fetch(modalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_id: jobId,
        prompt: data.prompt,
        model: data.model,
        parameters: {
          steps: data.steps,
          cfg_scale: data.cfgScale,
          width: data.width,
          height: data.height,
          seed: data.seed,
        },
      }),
    });

    if (!modalResponse.ok) {
      const errorText = await modalResponse.text();
      await db
        .update(generations)
        .set({ status: "failed", error: `Modal API error: ${errorText}` })
        .where(eq(generations.id, jobId));

      return NextResponse.json(
        { error: "Modal API error", message: errorText },
        { status: 500 }
      );
    }

    const modalResult = await modalResponse.json();

    return NextResponse.json({
      jobId,
      message: "Generation started",
      modalCallId: modalResult.call_id,
    });
  } catch (error) {
    console.error("Generation API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to start generation. Please try again.",
      },
      { status: 500 }
    );
  }
}
