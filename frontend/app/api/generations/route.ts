import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 100);
    const type = searchParams.get("type") as "image" | "video" | "audio" | null;

    const offset = (page - 1) * pageSize;

    // Build query conditions
    const conditions = [eq(generations.userId, userId)];
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

    return NextResponse.json({
      generations: results.map((gen) => ({
        id: gen.id,
        type: gen.type,
        model: gen.model,
        prompt: gen.prompt,
        parameters: gen.parameters,
        outputUrl: gen.outputUrl,
        status: gen.status,
        error: gen.error,
        processingTimeMs: gen.processingTimeMs,
        createdAt: gen.createdAt?.toISOString(),
        completedAt: gen.completedAt?.toISOString(),
      })),
      total,
      page,
      pageSize,
      hasMore: offset + results.length < total,
    });
  } catch (error) {
    console.error("Generations API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}
