import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";
import { dispatchModalJob } from "@/lib/modal-job";
import { IMAGE_PARAMS, toModalParams } from "@/lib/model-params";
import { imageGenerationSchema } from "@/lib/validation";

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
    const validationResult = imageGenerationSchema.safeParse(body);

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

    // Modal endpoint for image generation (Z-Image-Turbo)
    const modalApiUrl = process.env.IMAGE_GEN_API_URL;
    if (!modalApiUrl) {
      return NextResponse.json(
        { error: "Configuration error", message: "IMAGE_GEN_API_URL is not configured" },
        { status: 500 },
      );
    }
    const modalRequestHeaders = modalHeaders();

    // Create generation record in database
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: "image",
        model: data.model,
        prompt: data.prompt,
        parameters: data,
        status: "processing",
      })
      .returning({ id: generations.id });

    const jobId = generation.id;

    // Fire and forget: Modal answers long (cold-start) requests slowly or with a redirect.
    // Modal updates the row itself; dispatchModalJob only records failures.
    void dispatchModalJob({
      endpoint: modalApiUrl,
      headers: modalRequestHeaders,
      payload: {
        job_id: jobId,
        prompt: data.prompt,
        model: data.model,
        parameters: toModalParams(IMAGE_PARAMS, data),
      },
      markFailed: async (message) => {
        await db
          .update(generations)
          .set({ status: "failed", error: message })
          .where(eq(generations.id, jobId));
      },
    });

    return NextResponse.json({ jobId, message: "Generation started" });
  } catch (error) {
    console.error("Generation API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to start generation. Please try again.",
      },
      { status: 500 },
    );
  }
}
