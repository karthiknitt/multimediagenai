import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { R2_BUCKET, r2Client } from "@/lib/r2";
import { objectKeyFromUrl } from "@/lib/r2-keys";

/**
 * Same-origin proxy for a generation's output file (owner-checked).
 * Needed for 3D models and transcripts: <model-viewer> and fetch() load them with XHR,
 * which would require CORS on the bucket if we handed out a presigned URL instead.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ generationId: string }> },
) {
  try {
    const { generationId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Filtering by owner in the query means other users' ids look like "not found".
    const [generation] = await db
      .select({ outputUrl: generations.outputUrl })
      .from(generations)
      .where(and(eq(generations.id, generationId), eq(generations.userId, session.user.id)))
      .limit(1);
    if (!generation?.outputUrl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const object = await r2Client.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: objectKeyFromUrl(generation.outputUrl) }),
    );
    if (!object.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}
