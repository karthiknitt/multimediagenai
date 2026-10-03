/** Pure helpers for the analytics endpoint (kept separate so they are unit-testable). */

export interface DailyPoint {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
  cost: number;
}

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function parseRange(value: string | null): AnalyticsRange {
  const n = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(n) ? (n as AnalyticsRange) : 30;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** One point per day for the last `days` days ending at `today`, zero-filled. */
export function fillDailySeries(
  rows: { date: string; count: number; cost: number }[],
  days: number,
  today: Date = new Date(),
): DailyPoint[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i),
    );
    const key = dayKey(d);
    const row = byDate.get(key);
    out.push({ date: key, count: row?.count ?? 0, cost: row?.cost ?? 0 });
  }
  return out;
}

export function successRate(completed: number, failed: number): number | null {
  const finished = completed + failed;
  return finished === 0 ? null : completed / finished;
}
