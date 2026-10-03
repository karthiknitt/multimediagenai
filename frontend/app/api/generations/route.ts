import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Helper to check if file exists in R2 bucket
async function fileExistsInR2(publicUrl: string): Promise<boolean> {
  try {
    const urlParts = publicUrl.split("/");
    const objectKey = urlParts.slice(-3).join("/");

    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
    });

    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error("Error checking file existence in R2:", error);
    return false;
  }
}

// Helper to generate presigned URL from public URL
async function getPresignedUrl(publicUrl: string): Promise<string> {
  try {
    // Extract object key from public URL
    // Format: https://pub-{account_id}.r2.dev/images/20251225/xxx.png
    // We need: images/20251225/xxx.png
    const urlParts = publicUrl.split("/");
    const objectKey = urlParts.slice(-3).join("/");

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
    });

    return await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return publicUrl; // Fallback to public URL
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 100);
    const type = searchParams.get("type") as "image" | "video" | "audio" | "speech" | null;

    const offset = (page - 1) * pageSize;

    // Build query conditions
    // userId links each generation to the user who created it (for security and filtering)
    const conditions = [
      eq(generations.userId, userId),
      eq(generations.status, "completed"), // Only show completed generations in gallery
    ];
    if (type) {
      conditions.push(eq(generations.type, type));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .where(and(...conditions));

    // Get generations
    const results = await db
      .select()
      .from(generations)
      .where(and(...conditions))
      .orderBy(desc(generations.createdAt))
      .limit(pageSize)
      .offset(offset);

    const total = Number(count);

    // Generate presigned URLs and verify file existence in R2
    const generationsWithPresignedUrls = await Promise.all(
      results.map(async (gen) => {
        // Skip if no output URL (shouldn't happen for completed status, but safety check)
        if (!gen.outputUrl) {
          return null;
        }

        // Verify file exists in R2 bucket before returning
        const exists = await fileExistsInR2(gen.outputUrl);
        if (!exists) {
          console.warn(`File not found in R2 for generation ${gen.id}: ${gen.outputUrl}`);
          return null; // Filter out generations with missing files
        }

        // Generate presigned URL for secure access
        const presignedUrl = await getPresignedUrl(gen.outputUrl);

        return {
          id: gen.id,
          type: gen.type,
          model: gen.model,
          prompt: gen.prompt,
          parameters: gen.parameters,
          outputUrl: presignedUrl,
          status: gen.status,
          error: gen.error,
          progress: gen.progress,
          progressMessage: gen.progressMessage,
          processingTimeMs: gen.processingTimeMs,
          sourceImageUrl: gen.sourceImageUrl,
          createdAt: gen.createdAt?.toISOString(),
          completedAt: gen.completedAt?.toISOString(),
        };
      }),
    );

    // Filter out null entries (deleted files)
    const validGenerations = generationsWithPresignedUrls.filter((gen) => gen !== null);

    return NextResponse.json({
      generations: validGenerations,
      total: validGenerations.length, // Return actual count of valid files
      page,
      pageSize,
      hasMore: offset + results.length < total,
    });
  } catch (error) {
    console.error("Generations API error:", error);
    return NextResponse.json({ error: "Failed to fetch generations" }, { status: 500 });
  }
}
