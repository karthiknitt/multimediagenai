import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { modalHeaders } from "@/lib/modal";
import { dispatchModalJob } from "@/lib/modal-job";
import { MUSIC_PARAMS, TTS_PARAMS, toModalParams } from "@/lib/model-params";
import { audioGenerationSchema } from "@/lib/validation";

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

    const body = await request.json();

    // Validate request body
    const parsed = audioGenerationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const validatedData = parsed.data;

    // Generate UUID for the job
    const jobId = uuidv4();

    // Determine which backend to call based on variant
    const isMusicVariant = validatedData.variant === "music";
    const apiUrl = isMusicVariant ? process.env.AUDIO_GEN_API_URL : process.env.TTS_GEN_API_URL;

    if (!apiUrl) {
      console.error(
        `Missing environment variable: ${isMusicVariant ? "AUDIO_GEN_API_URL" : "TTS_GEN_API_URL"}`,
      );
      return NextResponse.json(
        { error: "Configuration error", message: "Audio generation is not configured" },
        { status: 500 },
      );
    }
    const modalRequestHeaders = modalHeaders();

    // Prepare the request payload based on variant
    let modalRequest: Record<string, unknown>;
    let modelName: string;

    if (isMusicVariant) {
      // ACE-Step music request
      modalRequest = {
        job_id: jobId,
        prompt: validatedData.prompt!,
        parameters: toModalParams(MUSIC_PARAMS, validatedData),
      };
      modelName = "ace-step-1.5";
    } else {
      // Qwen3-TTS request
      modalRequest = {
        job_id: jobId,
        text: validatedData.text!,
        voice_preset:
          validatedData.voicePreset !== "custom" ? validatedData.voicePreset : undefined,
        voice_reference_url:
          validatedData.voicePreset === "custom" ? validatedData.voiceReferenceUrl : undefined,
        language: validatedData.language,
        speed: validatedData.speed,
        parameters: toModalParams(TTS_PARAMS, validatedData),
      };
      modelName = "qwen3-tts";
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

    // Fire and forget; failures are recorded on the row
    void dispatchModalJob({
      endpoint: apiUrl,
      headers: modalRequestHeaders,
      payload: modalRequest,
      markFailed: async (message) => {
        await db
          .update(generations)
          .set({ status: "failed", error: message })
          .where(eq(generations.id, jobId));
      },
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    console.error("Audio generation error:", error);

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
