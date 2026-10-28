import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { INDIC_STT_LANGUAGES } from "@/lib/indic";
import { isAllowedMediaUrl } from "@/lib/media-url";
import { INDIC_STT_PARAMS, schemaFromDefs, toModalParams } from "@/lib/model-params";
import { startModalJob } from "@/lib/start-job";

const bodySchema = z.object({
  audioUrl: z.string().url(),
  language: z.enum(Object.keys(INDIC_STT_LANGUAGES) as [string, ...string[]]).default("hi"),
  fileName: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    const tuning = schemaFromDefs(INDIC_STT_PARAMS).safeParse(body);
    if (!parsed.success || !tuning.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    const { audioUrl, language, fileName } = parsed.data;
    if (!isAllowedMediaUrl(audioUrl, process.env.R2_PUBLIC_URL)) {
      return NextResponse.json(
        { error: "Audio must be uploaded through this app" },
        { status: 400 },
      );
    }

    const endpoint = process.env.INDIC_STT_API_URL;
    if (!endpoint) {
      return NextResponse.json({ error: "Transcription is not configured" }, { status: 500 });
    }

    return await startModalJob({
      jobId: randomUUID(),
      userId: session.user.id,
      type: "transcription",
      model: "indic-conformer-600m",
      prompt: fileName?.trim() || "Audio transcription",
      parameters: { language, audioUrl, ...tuning.data },
      endpoint,
      payload: {
        audio_url: audioUrl,
        language,
        parameters: toModalParams(INDIC_STT_PARAMS, tuning.data),
      },
      message: "Transcription started",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Failed to start transcription" }, { status: 500 });
  }
}
