"use client";

import { Coins } from "lucide-react";
import { useGeneration } from "@/hooks/useGeneration";
import { formatCostUsd } from "@/lib/format-cost";

/** Actual compute cost (and runtime) of a finished generation. */
export function GenerationCost({ generationId }: { generationId?: string | null }) {
  const { data } = useGeneration(generationId ?? "");
  const cost = formatCostUsd(data?.costUsd);
  if (!generationId || !cost) return null;

  const seconds = data?.processingTimeMs ? (data.processingTimeMs / 1000).toFixed(1) : null;
  return (
    <p
      className="flex items-center justify-center gap-2 text-sm text-foreground/70 mono"
      title="Compute cost of this run (GPU, CPU and memory; excludes startup time)"
    >
      <Coins className="h-4 w-4 text-cyan-400" />
      Cost {cost}
      {seconds && <span className="text-foreground/50">· {seconds}s on GPU</span>}
    </p>
  );
}
