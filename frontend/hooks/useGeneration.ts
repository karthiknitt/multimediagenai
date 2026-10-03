"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AudioGenerationRequest,
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "@/lib/validation";

// Types for API responses
export interface GenerationResponse {
  id: string;
  type: "image" | "video" | "audio" | "speech";
  status: "pending" | "processing" | "completed" | "failed";
  prompt: string;
  model: string;
  parameters: Record<string, unknown>;
  outputUrl?: string;
  error?: string;
  processingTimeMs?: number;
  costUsd?: number | null;
  createdAt: string;
  completedAt?: string;
}

export interface PaginatedGenerations {
  generations: GenerationResponse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// API functions
async function fetchGenerations(
  page: number = 1,
  pageSize: number = 20,
  type?: "image" | "video" | "audio" | "speech",
): Promise<PaginatedGenerations> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (type) params.set("type", type);

  const response = await fetch(`/api/generations?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch generations");
  }
  return response.json();
}

async function fetchGeneration(id: string): Promise<GenerationResponse> {
  const response = await fetch(`/api/generations/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch generation");
  }
  return response.json();
}

async function generateImage(input: ImageGenerationRequest): Promise<{ jobId: string }> {
  const response = await fetch("/api/generate-direct", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to start generation");
  }
  return response.json();
}

async function generateVideo(input: VideoGenerationRequest): Promise<{ jobId: string }> {
  const response = await fetch("/api/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to start generation");
  }
  return response.json();
}

async function generateAudio(input: AudioGenerationRequest): Promise<{ jobId: string }> {
  const response = await fetch("/api/generate-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to start generation");
  }
  return response.json();
}

async function cancelGeneration(jobId: string): Promise<void> {
  const response = await fetch(`/api/generations/${jobId}/cancel`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to cancel generation");
  }
}

async function deleteGeneration(id: string): Promise<void> {
  const response = await fetch(`/api/generations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete generation");
  }
}

// Query hooks
export function useGenerations(
  page: number = 1,
  pageSize: number = 20,
  type?: "image" | "video" | "audio" | "speech",
) {
  return useQuery({
    queryKey: ["generations", page, pageSize, type],
    queryFn: () => fetchGenerations(page, pageSize, type),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useGeneration(id: string) {
  return useQuery({
    queryKey: ["generation", id],
    queryFn: () => fetchGeneration(id),
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll more frequently for pending/processing jobs
      const data = query.state.data;
      if (data?.status === "pending" || data?.status === "processing") {
        return 2000; // 2 seconds
      }
      return false;
    },
  });
}

// Mutation hooks
export function useGenerateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateImage,
    onSuccess: () => {
      // Invalidate generations list to show new job
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}

export function useGenerateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}

export function useGenerateAudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAudio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}

export function useCancelGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelGeneration,
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["generation", jobId] });
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}

export function useDeleteGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGeneration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}
