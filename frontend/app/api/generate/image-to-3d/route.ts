import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAllowedMediaUrl } from "@/lib/media-url";
import { MODEL3D_PARAMS, schemaFromDefs, toModalParams } from "@/lib/model-params";
import { startModalJob } from "@/lib/start-job";

const bodySchema = z.object({
  imageUrl: z.string().url(),
  name: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    const tuning = schemaFromDefs(MODEL3D_PARAMS).safeParse(body);
    if (!parsed.success || !tuning.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    const { imageUrl, name } = parsed.data;
    if (!isAllowedMediaUrl(imageUrl, process.env.R2_PUBLIC_URL)) {
      return NextResponse.json(
        { error: "Image must be uploaded through this app" },
        { status: 400 },
      );
    }

    const endpoint = process.env.IMAGE_TO_3D_API_URL;
    if (!endpoint) {
      return NextResponse.json({ error: "3D generation is not configured" }, { status: 500 });
    }

    return await startModalJob({
      jobId: randomUUID(),
      userId: session.user.id,
      type: "model3d",
      model: tuning.data.refine ? "hunyuan3d-2mini+hi3d" : "hunyuan3d-2mini",
      prompt: name || "Image to 3D",
      parameters: { imageUrl, ...tuning.data },
      endpoint,
      payload: {
        image_url: imageUrl,
        parameters: toModalParams(MODEL3D_PARAMS, {
          ...tuning.data,
          resolution: Number(tuning.data.resolution),
        }),
      },
      message: "3D generation started",
    });
  } catch (error) {
    console.error("Image-to-3D error:", error);
    return NextResponse.json({ error: "Failed to start 3D generation" }, { status: 500 });
  }
}
