import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";
import { dispatchModalJob } from "@/lib/modal-job";
import { toModalParams, VIDEO_PARAMS } from "@/lib/model-params";
import { videoGenerationSchema } from "@/lib/validation";

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
    const validationResult = videoGenerationSchema.safeParse(body);

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

    // Pick the Modal endpoint for this variant (check config before creating a row)
    const endpoint =
      data.variant === "text2video"
        ? process.env.VIDEO_GEN_TEXT2VIDEO_API_URL
        : process.env.VIDEO_GEN_IMG2VIDEO_API_URL;

    if (!endpoint) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: `Video generation API not configured for ${data.variant}`,
        },
        { status: 500 },
      );
    }
    const modalRequestHeaders = modalHeaders();

    // Create generation record in database
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: "video",
        model: data.variant === "text2video" ? "wan22-t2v" : "wan22-i2v",
        prompt: data.prompt,
        parameters: data,
        status: "processing",
      })
      .returning({ id: generations.id });

    const jobId = generation.id;

    const modalPayload: Record<string, unknown> = {
      job_id: jobId,
      prompt: data.prompt,
      parameters: toModalParams(VIDEO_PARAMS, data),
    };
    if (data.variant === "img2video" && data.sourceImageUrl) {
      modalPayload.image_url = data.sourceImageUrl;
    }

    // Fire and forget: Wan2.2 takes minutes, so we must not hold this request open.
    // Modal writes progress and the final status/output_url to the row itself; the UI
    // polls it via /api/generation/[jobId]/stream.
    void dispatchModalJob({
      endpoint,
      headers: modalRequestHeaders,
      payload: modalPayload,
      markFailed: async (message) => {
        await db
          .update(generations)
          .set({ status: "failed", error: message })
          .where(eq(generations.id, jobId));
      },
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
