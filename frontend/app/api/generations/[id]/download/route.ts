import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { downloadFilename, objectKeyFromUrl } from "@/lib/r2-keys";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Same-origin download of a generation's file: owner-checked and streamed from R2, so the
 * browser never needs cross-origin access to the bucket (which is what made client-side
 * fetch() downloads fail).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [generation] = await db
      .select({ type: generations.type, outputUrl: generations.outputUrl })
      .from(generations)
      .where(and(eq(generations.id, id), eq(generations.userId, session.user.id)))
      .limit(1);
    if (!generation?.outputUrl) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    const object = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: objectKeyFromUrl(generation.outputUrl),
      }),
    );
    if (!object.Body) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
    }

    const filename = downloadFilename(generation.type, id, generation.outputUrl);
    const responseHeaders: Record<string, string> = {
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    };
    if (object.ContentLength !== undefined) {
      responseHeaders["Content-Length"] = String(object.ContentLength);
    }
    return new NextResponse(object.Body.transformToWebStream(), { headers: responseHeaders });
  } catch (error) {
    console.error("Generation download error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
