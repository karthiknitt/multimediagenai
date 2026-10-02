import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Secure Image Access API Route
 *
 * Generates pre-signed URLs for R2 images with temporary access.
 * This keeps the R2 bucket private while allowing authenticated users to access their images.
 */

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ generationId: string }> },
) {
  try {
    const { generationId } = await params;

    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get generation from database
    const [generation] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Verify user owns this generation
    if (generation.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden - this generation belongs to another user" },
        { status: 403 },
      );
    }

    // Check if generation has output
    if (!generation.outputUrl) {
      return NextResponse.json({ error: "Generation not completed yet" }, { status: 404 });
    }

    // Extract object key from the URL
    // URL format: https://pub-{account_id}.r2.dev/images/20251225/xxx.png
    // We need: images/20251225/xxx.png
    const urlParts = generation.outputUrl.split("/");
    const objectKey = urlParts.slice(-3).join("/"); // Get last 3 parts: images/20251225/xxx.png

    // Generate pre-signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      url: presignedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return NextResponse.json({ error: "Failed to generate secure image URL" }, { status: 500 });
  }
}
