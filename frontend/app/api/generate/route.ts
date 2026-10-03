import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { inngest } from "@/inngest/client";

// Combined validation schema for all generation types
const generateRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    prompt: z.string().min(3).max(2000),
    model: z.enum(["z-image-turbo"]),
    steps: z.number().min(1).max(100).default(30),
    cfgScale: z.number().min(1).max(20).default(7),
    width: z.number().min(256).max(2048).default(1024),
    height: z.number().min(256).max(2048).default(1024),
    seed: z.number().optional(),
    negativePrompt: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("video"),
    prompt: z.string().min(3).max(2000),
    model: z.enum(["wan22-t2v", "wan22-i2v"]),
    variant: z.enum(["text2video", "img2video"]),
    duration: z.number().min(1).max(10).default(5),
    fps: z.number().min(15).max(30).default(30),
    motionStrength: z.number().min(1).max(10).default(5),
    sourceImageUrl: z.string().url().optional(),
    seed: z.number().optional(),
  }),
  z.object({
    type: z.literal("audio"),
    prompt: z.string().min(3).max(1000),
    duration: z.number().min(5).max(60).default(30),
    temperature: z.number().min(0.1).max(2).default(1),
  }),
]);

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

    // Determine model based on type
    let modelName: string;
    if (data.type === "image") {
      modelName = data.model;
    } else if (data.type === "video") {
      modelName = data.model;
    } else {
      modelName = "ace-step-1.5";
    }

    // TODO: Check rate limits
    // const { remaining, reset } = await checkRateLimit(userId);
    // if (remaining <= 0) {
    //   return NextResponse.json(
    //     { error: "Rate limit exceeded", message: `Try again after ${reset}` },
    //     { status: 429 }
    //   );
    // }

    // Create generation record in database
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: data.type,
        model: modelName,
        prompt: data.prompt,
        parameters: data,
        status: "pending",
      })
      .returning({ id: generations.id });

    const jobId = generation.id;

    // Emit Inngest event to start generation
    await inngest.send({
      name: "generation/requested",
      data: {
        jobId,
        userId,
        ...data,
      },
    });

    return NextResponse.json({
      jobId,
      message: "Generation started",
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
