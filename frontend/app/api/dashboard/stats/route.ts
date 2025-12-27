import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Helper to get file size from R2
async function getFileSizeFromR2(publicUrl: string): Promise<number> {
  try {
    const urlParts = publicUrl.split('/');
    const objectKey = urlParts.slice(-3).join('/');

    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
    });

    const response = await r2Client.send(command);
    return response.ContentLength || 0;
  } catch (error) {
    console.error("Error getting file size from R2:", error);
    return 0;
  }
}

// Helper to calculate total storage used by user
async function calculateUserStorage(userId: string): Promise<number> {
  try {
    // Get all completed generations with output URLs
    const userGenerations = await db
      .select({ outputUrl: generations.outputUrl })
      .from(generations)
      .where(
        and(
          eq(generations.userId, userId),
          eq(generations.status, "completed")
        )
      );

    // Calculate total size by fetching each file's size from R2
    let totalSize = 0;
    for (const gen of userGenerations) {
      if (gen.outputUrl) {
        const size = await getFileSizeFromR2(gen.outputUrl);
        totalSize += size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error("Error calculating user storage:", error);
    return 0;
  }
}

export async function GET() {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total generations count
    const [{ totalGenerations }] = await db
      .select({ totalGenerations: sql<number>`count(*)` })
      .from(generations)
      .where(eq(generations.userId, userId));

    // Get this month's stats by type
    const monthlyStats = await db
      .select({
        type: generations.type,
        count: sql<number>`count(*)`,
      })
      .from(generations)
      .where(
        and(
          eq(generations.userId, userId),
          gte(generations.createdAt, monthStart)
        )
      )
      .groupBy(generations.type);

    // Parse monthly stats
    const imagesGenerated = monthlyStats.find(s => s.type === "image")?.count || 0;
    const videosGenerated = monthlyStats.find(s => s.type === "video")?.count || 0;
    const audioGenerated = monthlyStats.find(s => s.type === "audio")?.count || 0;
    const speechGenerated = monthlyStats.find(s => s.type === "speech")?.count || 0;

    // Get today's generation count (for rate limiting)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [{ todayCount }] = await db
      .select({ todayCount: sql<number>`count(*)` })
      .from(generations)
      .where(
        and(
          eq(generations.userId, userId),
          gte(generations.createdAt, todayStart)
        )
      );

    // Calculate storage used (in bytes)
    const storageUsedBytes = await calculateUserStorage(userId);
    const storageUsedMB = Math.round(storageUsedBytes / (1024 * 1024));

    // Calculate remaining generations (10 per day free tier)
    const dailyLimit = 10;
    const remainingGenerations = Math.max(0, dailyLimit - Number(todayCount));

    return NextResponse.json({
      totalGenerations: Number(totalGenerations),
      imagesGenerated: Number(imagesGenerated),
      videosGenerated: Number(videosGenerated),
      audioGenerated: Number(audioGenerated) + Number(speechGenerated), // Combine audio and speech
      storageUsedMB,
      remainingGenerations,
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
