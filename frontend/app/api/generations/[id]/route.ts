import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get generation
    const [generation] = await db
      .select()
      .from(generations)
      .where(and(eq(generations.id, id), eq(generations.userId, session.user.id)))
      .limit(1);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: generation.id,
      type: generation.type,
      model: generation.model,
      prompt: generation.prompt,
      parameters: generation.parameters,
      outputUrl: generation.outputUrl,
      status: generation.status,
      error: generation.error,
      processingTimeMs: generation.processingTimeMs,
      costUsd: generation.costUsd,
      createdAt: generation.createdAt?.toISOString(),
      completedAt: generation.completedAt?.toISOString(),
    });
  } catch (error) {
    console.error("Generation API error:", error);
    return NextResponse.json({ error: "Failed to fetch generation" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete generation (only if it belongs to user)
    const result = await db
      .delete(generations)
      .where(and(eq(generations.id, id), eq(generations.userId, session.user.id)))
      .returning({ id: generations.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // TODO: Delete file from R2 if exists

    return NextResponse.json({
      message: "Generation deleted successfully",
    });
  } catch (error) {
    console.error("Delete generation error:", error);
    return NextResponse.json({ error: "Failed to delete generation" }, { status: 500 });
  }
}
