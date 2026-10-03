import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";
import { dispatchModalJob } from "@/lib/modal-job";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { text, voiceReferenceUrl, language = "en", speed = 1.0 } = body;

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ error: "Text must be 500 characters or less" }, { status: 400 });
    }

    // Generate unique job ID
    const jobId = uuidv4();

    const ttsApiUrl = process.env.TTS_GEN_API_URL;
    if (!ttsApiUrl) {
      return NextResponse.json({ error: "Speech generation is not configured" }, { status: 500 });
    }
    const modalRequestHeaders = modalHeaders();

    // Create generation record in database
    await db.insert(generations).values({
      id: jobId,
      userId: session.user.id,
      type: "speech",
      model: "qwen3-tts",
      prompt: text,
      parameters: {
        language,
        speed,
        voiceReferenceUrl,
      },
      status: "processing",
      progress: 0,
    });

    // Trigger generation (fire and forget; failures are recorded on the row)
    void dispatchModalJob({
      endpoint: ttsApiUrl,
      headers: modalRequestHeaders,
      payload: {
        job_id: jobId,
        text,
        voice_reference_url: voiceReferenceUrl,
        language,
        speed,
      },
      markFailed: async (message) => {
        await db
          .update(generations)
          .set({ status: "failed", error: message })
          .where(eq(generations.id, jobId));
      },
    });

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      status: "pending",
      message: "Speech generation started",
    });
  } catch (error) {
    console.error("Speech generation error:", error);
    return NextResponse.json({ error: "Failed to start speech generation" }, { status: 500 });
  }
}
