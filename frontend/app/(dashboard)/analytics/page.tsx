"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Coins, Cpu, Layers, Timer } from "lucide-react";
import { useState } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ANALYTICS_RANGES, type AnalyticsRange, type DailyPoint } from "@/lib/analytics";
import { formatCostUsd } from "@/lib/format-cost";
import { cn } from "@/lib/utils";

interface AnalyticsResponse {
  range: number;
  summary: {
    total: number;
    completed: number;
    failed: number;
    successRate: number | null;
    totalCostUsd: number;
    avgProcessingMs: number | null;
    gpuSeconds: number;
  };
  lifetime: { total: number; totalCostUsd: number };
  byType: { type: string; count: number; cost: number }[];
  byModel: {
    model: string;
    count: number;
    cost: number;
    avgProcessingMs: number | null;
    avgCostUsd: number | null;
  }[];
  daily: DailyPoint[];
}

const TYPE_COLORS: Record<string, string> = {
  image: "bg-cyan-400",
  video: "bg-magenta-400",
  audio: "bg-blue-400",
  speech: "bg-emerald-400",
};

async function fetchAnalytics(range: AnalyticsRange): Promise<AnalyticsResponse> {
  const res = await fetch(`/api/analytics?range=${range}`);
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

function formatSeconds(ms: number | null): string {
  if (ms === null) return "—";
  const s = ms / 1000;
  return s >= 60 ? `${(s / 60).toFixed(1)} min` : `${s.toFixed(1)} s`;
}

function DailyChart({ data, metric }: { data: DailyPoint[]; metric: "count" | "cost" }) {
  const max = Math.max(...data.map((d) => d[metric]), metric === "count" ? 1 : 0.0001);
  const label = (d: DailyPoint) =>
    metric === "count"
      ? `${d.date}: ${d.count} generation${d.count === 1 ? "" : "s"}`
      : `${d.date}: ${formatCostUsd(d.cost)}`;

  return (
    <div>
      <div
        className="flex h-40 items-end gap-px sm:gap-0.5"
        role="img"
        aria-label={`Daily ${metric}`}
      >
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-t-sm transition-opacity group-hover:opacity-80",
                metric === "count" ? "bg-cyan-400/80" : "bg-magenta-400/80",
              )}
              style={{ height: `${d[metric] > 0 ? Math.max((d[metric] / max) * 100, 3) : 0}%` }}
              title={label(d)}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-foreground/50 mono">
        <span>{data[0]?.date}</span>
        <span>{data.at(-1)?.date}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => fetchAnalytics(range),
    staleTime: 30 * 1000,
  });

  const maxTypeCount = Math.max(...(data?.byType.map((t) => t.count) ?? [1]), 1);
  const empty = !!data && data.summary.total === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-foreground/60 text-lg">
            Usage, spend and performance of your generations
          </p>
        </div>
        <div
          className="glass inline-flex rounded-xl border border-foreground/10 p-1"
          role="group"
          aria-label="Time range"
        >
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                range === r
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      {isLoading && <p className="text-foreground/60">Loading analytics…</p>}
      {error && (
        <p className="text-red-400" role="alert">
          Couldn't load analytics. Please refresh.
        </p>
      )}

      {data && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Generations"
              value={data.summary.total}
              description={`${data.lifetime.total} all time`}
              icon={Layers}
              gradient="from-cyan-500/10 to-cyan-500/5"
              iconColor="text-cyan-400"
            />
            <StatsCard
              title="Spend"
              value={formatCostUsd(data.summary.totalCostUsd) ?? "$0.00"}
              description={`${formatCostUsd(data.lifetime.totalCostUsd) ?? "$0.00"} all time`}
              icon={Coins}
              gradient="from-magenta-500/10 to-magenta-500/5"
              iconColor="text-magenta-400"
            />
            <StatsCard
              title="Success rate"
              value={
                data.summary.successRate === null
                  ? "—"
                  : `${Math.round(data.summary.successRate * 100)}%`
              }
              description={`${data.summary.completed} completed · ${data.summary.failed} failed`}
              icon={CheckCircle2}
              gradient="from-emerald-500/10 to-emerald-500/5"
              iconColor="text-emerald-400"
            />
            <StatsCard
              title="Avg. run time"
              value={formatSeconds(data.summary.avgProcessingMs)}
              description={`${(data.summary.gpuSeconds / 60).toFixed(1)} GPU-min total`}
              icon={Timer}
              gradient="from-blue-500/10 to-blue-500/5"
              iconColor="text-blue-400"
            />
          </section>

          {empty ? (
            <div className="card-premium p-10 text-center text-foreground/60">
              No generations in the last {range} days. Create something and it will show up here.
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="card-premium p-6">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                    Generations per day
                  </h2>
                  <DailyChart data={data.daily} metric="count" />
                </div>
                <div className="card-premium p-6">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                    Spend per day
                  </h2>
                  <DailyChart data={data.daily} metric="cost" />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="card-premium p-6 lg:col-span-1">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                    By type
                  </h2>
                  <ul className="space-y-4">
                    {data.byType.map((t) => (
                      <li key={t.type}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-semibold capitalize">{t.type}</span>
                          <span className="text-foreground/60 mono">
                            {t.count} · {formatCostUsd(t.cost) ?? "$0.00"}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              TYPE_COLORS[t.type] ?? "bg-cyan-400",
                            )}
                            style={{ width: `${(t.count / maxTypeCount) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-premium overflow-x-auto p-6 lg:col-span-2">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                    By model
                  </h2>
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-foreground/50">
                      <tr>
                        <th className="pb-2 font-semibold">Model</th>
                        <th className="pb-2 text-right font-semibold">Runs</th>
                        <th className="pb-2 text-right font-semibold">Avg time</th>
                        <th className="pb-2 text-right font-semibold">Avg cost</th>
                        <th className="pb-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="mono">
                      {data.byModel.map((m) => (
                        <tr key={m.model} className="border-t border-foreground/10">
                          <td className="py-2 font-semibold">{m.model}</td>
                          <td className="py-2 text-right">{m.count}</td>
                          <td className="py-2 text-right">{formatSeconds(m.avgProcessingMs)}</td>
                          <td className="py-2 text-right">{formatCostUsd(m.avgCostUsd) ?? "—"}</td>
                          <td className="py-2 text-right text-cyan-400">
                            {formatCostUsd(m.cost) ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
