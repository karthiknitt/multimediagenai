import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";

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
      status: "pending",
      progress: 0,
    });

    // Call Modal TTS API
    const ttsApiUrl = process.env.TTS_GEN_API_URL;
    if (!ttsApiUrl) {
      throw new Error("TTS_GEN_API_URL not configured");
    }

    // Trigger generation (fire and forget)
    fetch(ttsApiUrl, {
      method: "POST",
      headers: modalHeaders(),
      body: JSON.stringify({
        job_id: jobId,
        text,
        voice_reference_url: voiceReferenceUrl,
        language,
        speed,
      }),
    }).catch((error) => {
      console.error("Modal API error:", error);
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
