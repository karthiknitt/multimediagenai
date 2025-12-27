import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { audioGenerationSchema } from "@/lib/validation";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    const body = await request.json();

    // Validate request body
    const validatedData = audioGenerationSchema.parse(body);

    // Generate UUID for the job
    const jobId = uuidv4();

    // Determine which backend to call based on variant
    const isMusicVariant = validatedData.variant === "music";
    const apiUrl = isMusicVariant
      ? process.env.AUDIO_GEN_API_URL
      : process.env.TTS_GEN_API_URL;

    if (!apiUrl) {
      throw new Error(
        `Missing environment variable: ${
          isMusicVariant ? "AUDIO_GEN_API_URL" : "TTS_GEN_API_URL"
        }`
      );
    }

    // Prepare the request payload based on variant
    let modalRequest: Record<string, unknown>;
    let modelName: string;

    if (isMusicVariant) {
      // MusicGen request
      modalRequest = {
        job_id: jobId,
        prompt: validatedData.prompt!,
        parameters: {
          duration: validatedData.duration,
          guidance_scale: validatedData.guidanceScale,
        },
      };
      modelName = "musicgen-large";
    } else {
      // F5-TTS request
      modalRequest = {
        job_id: jobId,
        text: validatedData.text!,
        voice_preset: validatedData.voicePreset !== "custom" ? validatedData.voicePreset : undefined,
        voice_reference_url: validatedData.voicePreset === "custom" ? validatedData.voiceReferenceUrl : undefined,
        language: validatedData.language,
        speed: validatedData.speed,
      };
      modelName = "f5-tts";
    }

    // Insert record into database
    await db.insert(generations).values({
      id: jobId,
      userId: userId,
      type: "audio",
      model: modelName,
      prompt: isMusicVariant ? validatedData.prompt! : validatedData.text!,
      parameters: validatedData,
      status: "pending",
      progress: 0,
    });

    // Call Modal API (async, don't await)
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(modalRequest),
    }).catch((error) => {
      console.error("Modal API call failed:", error);
      // Update database with error (fire and forget)
      db.update(generations)
        .set({
          status: "failed",
          error: `Modal API error: ${error.message}`,
        })
        .where(eq(generations.id, jobId))
        .catch(console.error);
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    console.error("Audio generation error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
