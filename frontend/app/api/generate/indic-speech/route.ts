import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { INDIC_TTS_LANGUAGES, INDIC_VOICES } from "@/lib/indic";
import { INDIC_TTS_PARAMS, schemaFromDefs, toModalParams } from "@/lib/model-params";
import { startModalJob } from "@/lib/start-job";

const bodySchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(1000),
  language: z.enum(Object.keys(INDIC_TTS_LANGUAGES) as [string, ...string[]]).default("hi"),
  voice: z.enum(INDIC_VOICES).default("Ahana"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    const tuning = schemaFromDefs(INDIC_TTS_PARAMS).safeParse(body);
    if (!parsed.success || !tuning.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const endpoint = process.env.INDIC_TTS_API_URL;
    if (!endpoint) {
      return NextResponse.json({ error: "Indic speech is not configured" }, { status: 500 });
    }

    const { text, language, voice } = parsed.data;
    return await startModalJob({
      jobId: randomUUID(),
      userId: session.user.id,
      type: "speech",
      model: "maya2-native",
      prompt: text,
      parameters: { language, voice, ...tuning.data },
      endpoint,
      payload: {
        text,
        language,
        voice,
        parameters: toModalParams(INDIC_TTS_PARAMS, tuning.data),
      },
      message: "Speech generation started",
    });
  } catch (error) {
    console.error("Indic speech error:", error);
    return NextResponse.json({ error: "Failed to start speech generation" }, { status: 500 });
  }
}
