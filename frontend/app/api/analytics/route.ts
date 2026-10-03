import { and, eq, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { generations } from "@/db/schema";
import { fillDailySeries, parseRange, successRate } from "@/lib/analytics";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const days = parseRange(request.nextUrl.searchParams.get("range"));
    const now = new Date();
    const since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)),
    );
    const inRange = and(eq(generations.userId, userId), gte(generations.createdAt, since));

    const [summary] = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${generations.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${generations.status} = 'failed')`,
        totalCost: sql<number>`coalesce(sum(${generations.costUsd}), 0)`,
        avgMs: sql<number | null>`avg(${generations.processingTimeMs})`,
        gpuMs: sql<number>`coalesce(sum(${generations.processingTimeMs}), 0)`,
      })
      .from(generations)
      .where(inRange);

    const byType = await db
      .select({
        type: generations.type,
        count: sql<number>`count(*)`,
        cost: sql<number>`coalesce(sum(${generations.costUsd}), 0)`,
      })
      .from(generations)
      .where(inRange)
      .groupBy(generations.type);

    const byModel = await db
      .select({
        model: generations.model,
        count: sql<number>`count(*)`,
        cost: sql<number>`coalesce(sum(${generations.costUsd}), 0)`,
        avgMs: sql<number | null>`avg(${generations.processingTimeMs})`,
        avgCost: sql<number | null>`avg(${generations.costUsd})`,
      })
      .from(generations)
      .where(inRange)
      .groupBy(generations.model)
      .orderBy(sql`count(*) desc`);

    const dailyRows = await db
      .select({
        date: sql<string>`to_char(${generations.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
        cost: sql<number>`coalesce(sum(${generations.costUsd}), 0)`,
      })
      .from(generations)
      .where(inRange)
      .groupBy(sql`to_char(${generations.createdAt}, 'YYYY-MM-DD')`);

    const [lifetime] = await db
      .select({
        total: sql<number>`count(*)`,
        totalCost: sql<number>`coalesce(sum(${generations.costUsd}), 0)`,
      })
      .from(generations)
      .where(eq(generations.userId, userId));

    const completed = Number(summary.completed);
    const failed = Number(summary.failed);

    return NextResponse.json({
      range: days,
      summary: {
        total: Number(summary.total),
        completed,
        failed,
        successRate: successRate(completed, failed),
        totalCostUsd: Number(summary.totalCost),
        avgProcessingMs: summary.avgMs === null ? null : Number(summary.avgMs),
        gpuSeconds: Number(summary.gpuMs) / 1000,
      },
      lifetime: { total: Number(lifetime.total), totalCostUsd: Number(lifetime.totalCost) },
      byType: byType.map((t) => ({ type: t.type, count: Number(t.count), cost: Number(t.cost) })),
      byModel: byModel.map((m) => ({
        model: m.model,
        count: Number(m.count),
        cost: Number(m.cost),
        avgProcessingMs: m.avgMs === null ? null : Number(m.avgMs),
        avgCostUsd: m.avgCost === null ? null : Number(m.avgCost),
      })),
      daily: fillDailySeries(
        dailyRows.map((r) => ({ date: r.date, count: Number(r.count), cost: Number(r.cost) })),
        days,
        now,
      ),
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
