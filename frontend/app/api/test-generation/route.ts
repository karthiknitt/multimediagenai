import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * TEMPORARY TEST ENDPOINT
 *
 * This endpoint simulates what Modal would do after image generation completes.
 * It updates a generation record to "completed" status with a placeholder image.
 *
 * To test the full flow:
 * 1. Generate an image (it will stay in "processing" state)
 * 2. Copy the job ID from the browser console
 * 3. Call this endpoint: POST /api/test-generation with { jobId: "..." }
 * 4. The UI will detect the completion and display the result
 *
 * Remove this file once Modal backend is properly deployed.
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    // Get the generation record
    const [generation] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, jobId))
      .limit(1);

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Update to completed with a placeholder image
    await db
      .update(generations)
      .set({
        status: "completed",
        outputUrl: "https://placehold.co/1024x1024/6366f1/white?text=Generated+Image",
        processingTimeMs: 5000,
        completedAt: new Date(),
      })
      .where(eq(generations.id, jobId));

    return NextResponse.json({
      success: true,
      message: "Generation marked as completed (TEST MODE)",
      jobId,
    });
  } catch (error) {
    console.error("Test generation error:", error);
    return NextResponse.json(
      { error: "Failed to update generation" },
      { status: 500 }
    );
  }
}
