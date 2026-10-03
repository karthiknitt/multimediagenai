"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGenerationStore } from "@/store/generation-store";

export interface ProgressEvent {
  type: "progress" | "completed" | "failed" | "heartbeat";
  jobId: string;
  progress?: number;
  status?: string;
  message?: string;
  outputUrl?: string;
  error?: string;
  timestamp: string;
}

interface UseGenerationStreamOptions {
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (event: ProgressEvent) => void;
  onError?: (event: ProgressEvent) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export function useGenerationStream(
  jobId: string | null,
  options: UseGenerationStreamOptions = {},
) {
  const {
    onProgress,
    onComplete,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = 3,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const queryClient = useQueryClient();
  const { updateJob, addToHistory } = useGenerationStore();

  const connect = useCallback(() => {
    if (!jobId) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection
    const url = `/api/generation/${jobId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        setLastEvent(data);

        // Update store
        if (data.type === "progress" && data.progress !== undefined) {
          updateJob(jobId, {
            progress: data.progress,
            status: "processing",
          });
          onProgress?.(data);
        } else if (data.type === "completed") {
          updateJob(jobId, {
            status: "completed",
            progress: 100,
            outputUrl: data.outputUrl,
            completedAt: data.timestamp,
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["generation", jobId] });
          queryClient.invalidateQueries({ queryKey: ["generations"] });

          // Move to history
          const store = useGenerationStore.getState();
          const job = store.activeJobs.find((j) => j.id === jobId);
          if (job) {
            addToHistory({ ...job, status: "completed", outputUrl: data.outputUrl });
          }

          onComplete?.(data);

          // Close connection on completion
          eventSource.close();
          setIsConnected(false);
        } else if (data.type === "failed") {
          updateJob(jobId, {
            status: "failed",
            error: data.error,
          });

          queryClient.invalidateQueries({ queryKey: ["generation", jobId] });
          queryClient.invalidateQueries({ queryKey: ["generations"] });

          onError?.(data);

          // Close connection on failure
          eventSource.close();
          setIsConnected(false);
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Attempt reconnect if enabled
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError("Connection lost. Please refresh the page.");
      }
    };
  }, [
    jobId,
    onProgress,
    onComplete,
    onError,
    autoReconnect,
    maxReconnectAttempts,
    queryClient,
    updateJob,
    addToHistory,
  ]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect when jobId changes
  useEffect(() => {
    if (jobId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [jobId, connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    error,
    connect,
    disconnect,
  };
}

// Hook for managing multiple generation streams
export function useGenerationStreams() {
  const [streams, setStreams] = useState<Map<string, { progress: number; status: string }>>(
    new Map(),
  );

  const addStream = useCallback((jobId: string) => {
    setStreams((prev) => new Map(prev).set(jobId, { progress: 0, status: "pending" }));
  }, []);

  const updateStream = useCallback((jobId: string, progress: number, status: string) => {
    setStreams((prev) => new Map(prev).set(jobId, { progress, status }));
  }, []);

  const removeStream = useCallback((jobId: string) => {
    setStreams((prev) => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  return {
    streams,
    addStream,
    updateStream,
    removeStream,
  };
}
