"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useGenerationStream } from "@/hooks/useGenerationStream";

/** POST a job-starting route and return the new job id. */
export async function postJob(url: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "Failed to start generation");
  return data.jobId as string;
}

/** Tracks one running job via the SSE stream and exposes progress / result / failure. */
export function useJobTracker() {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const { lastEvent, isConnected } = useGenerationStream(activeJobId, {
    onComplete: () => {
      setCompletedJobId(activeJobId);
      setActiveJobId(null);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
    onError: (event) => {
      setFailure(event.error ?? "Generation failed. Please try again.");
      setActiveJobId(null);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });

  const start = useCallback((jobId: string) => {
    setFailure(null);
    setCompletedJobId(null);
    setActiveJobId(jobId);
  }, []);

  const status =
    lastEvent?.type === "progress" && (lastEvent.progress ?? 0) > 0 ? "processing" : "pending";

  return {
    activeJobId,
    completedJobId,
    setCompletedJobId,
    failure,
    setFailure,
    start,
    cancel: () => setActiveJobId(null),
    isRunning: !!activeJobId,
    isConnected,
    progress: lastEvent?.progress ?? 0,
    message: lastEvent?.message,
    status: status as "pending" | "processing",
  };
}
