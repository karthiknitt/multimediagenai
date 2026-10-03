"use client";

import {
  AlertCircle,
  Download,
  Filter,
  Image,
  Loader2,
  Mic,
  Music,
  Trash2,
  Video,
} from "lucide-react";
import { useCallback, useState } from "react";
import { MediaModal } from "@/components/generation/MediaModal";
import { VideoThumbnail } from "@/components/generation/VideoThumbnail";
import { useDeleteGeneration, useGenerations } from "@/hooks/useGeneration";
import { formatDistanceToNow } from "@/lib/date-utils";
import { formatCostUsd } from "@/lib/format-cost";
import { cn } from "@/lib/utils";

const typeIcons = {
  image: Image,
  video: Video,
  audio: Music,
  speech: Mic,
};

const typeColors = {
  image: "text-cyan-400",
  video: "text-magenta-400",
  audio: "text-blue-400",
  speech: "text-green-400",
};

const typeGradients = {
  image: "from-cyan-500/20 to-blue-500/20",
  video: "from-magenta-500/20 to-purple-500/20",
  audio: "from-blue-500/20 to-cyan-500/20",
  speech: "from-green-500/20 to-emerald-500/20",
};

type MediaType = "all" | "image" | "video" | "audio" | "speech";

export default function GalleryPage() {
  const [selectedType, setSelectedType] = useState<MediaType>("all");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const { data, isLoading, error } = useGenerations(
    page,
    pageSize,
    selectedType === "all" ? undefined : selectedType,
  );

  const deleteGeneration = useDeleteGeneration();

  const [viewing, setViewing] = useState<{
    id: string;
    type: "image" | "video";
    src: string;
    title: string;
  } | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this generation?")) {
      await deleteGeneration.mutateAsync(id);
    }
  };

  const generations = data?.generations || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            <span className="gradient-text">Gallery</span>
          </h1>
          <p className="text-foreground/60 text-lg">All your AI-generated content in one place</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="card-premium p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all" as MediaType, label: "All", icon: Filter },
            { value: "image" as MediaType, label: "Images", icon: Image },
            { value: "video" as MediaType, label: "Videos", icon: Video },
            { value: "audio" as MediaType, label: "Music", icon: Music },
            { value: "speech" as MediaType, label: "Speech", icon: Mic },
          ].map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedType === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setSelectedType(filter.value);
                  setPage(1); // Reset to first page on filter change
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all",
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-foreground/60">
        <span className="font-semibold mono">
          {total} {total === 1 ? "item" : "items"}
        </span>
        {selectedType !== "all" && <span className="text-foreground/40">•</span>}
        {selectedType !== "all" && (
          <span>
            Filtered by: <span className="capitalize font-semibold">{selectedType}</span>
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card-premium p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <div>
              <h3 className="font-bold text-lg mb-1">Failed to load gallery</h3>
              <p className="text-sm text-foreground/60">
                There was an error loading your generations. Please try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && generations.length === 0 && (
        <div className="card-premium p-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-2xl bg-cyan-500/10">
              <Image className="h-12 w-12 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">No generations yet</h3>
              <p className="text-sm text-foreground/60">
                {selectedType === "all"
                  ? "Start creating AI content to see it here"
                  : `No ${selectedType} generations found`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {!isLoading && !error && generations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {generations.map((gen) => {
            const Icon = typeIcons[gen.type as keyof typeof typeIcons];
            const iconColor = typeColors[gen.type as keyof typeof typeColors];
            const gradient = typeGradients[gen.type as keyof typeof typeGradients];

            return (
              <div key={gen.id} className="card-premium hover-lift group overflow-hidden">
                {/* Media preview */}
                <div
                  className={cn(
                    "relative aspect-square overflow-hidden bg-gradient-to-br",
                    gradient,
                  )}
                >
                  {/* All items are completed with outputUrl (verified in API) */}
                  {gen.type === "image" && (
                    <img
                      src={gen.outputUrl}
                      alt={gen.prompt}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  {gen.type === "video" && (
                    <VideoThumbnail
                      src={gen.outputUrl}
                      label={gen.prompt}
                      className="h-full w-full"
                    />
                  )}
                  {(gen.type === "audio" || gen.type === "speech") && (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon className={cn("h-16 w-16", iconColor)} />
                    </div>
                  )}

                  {/* Click to open image/video full-size in a modal (audio plays inline below) */}
                  {(gen.type === "image" || gen.type === "video") && gen.outputUrl && (
                    <button
                      type="button"
                      aria-label={`Open ${gen.type}: ${gen.prompt.slice(0, 60)}`}
                      className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      onClick={() =>
                        setViewing({
                          id: gen.id,
                          type: gen.type as "image" | "video",
                          src: gen.outputUrl as string,
                          title: gen.prompt,
                        })
                      }
                    />
                  )}

                  {/* Type badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                    <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                    <span className="text-xs capitalize text-white font-semibold mono">
                      {gen.type}
                    </span>
                  </div>

                  {/* Action buttons - show on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <a
                        href={`/api/generations/${gen.id}/download`}
                        download
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(gen.id)}
                        className="flex items-center justify-center px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  {/* Prompt */}
                  <p className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{gen.prompt}</p>

                  {/* Audio player for audio/speech */}
                  {gen.status === "completed" &&
                    gen.outputUrl &&
                    (gen.type === "audio" || gen.type === "speech") && (
                      <audio controls className="w-full" style={{ height: "32px" }}>
                        <source src={gen.outputUrl} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                    )}

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-foreground/60 mono">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                      <span className="capitalize font-semibold">{gen.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formatCostUsd(gen.costUsd) && (
                        <span
                          className="font-semibold text-cyan-400"
                          title="Compute cost of this generation"
                        >
                          {formatCostUsd(gen.costUsd)}
                        </span>
                      )}
                      <span>{formatDistanceToNow(gen.createdAt)}</span>
                    </div>
                  </div>

                  {/* Model */}
                  <div className="text-xs text-foreground/40 mono">{gen.model}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && generations.length > 0 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold transition-all",
              page === 1 ? "text-foreground/30 cursor-not-allowed" : "btn-premium",
            )}
          >
            Previous
          </button>
          <span className="text-sm text-foreground/60 mono">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold transition-all",
              !hasMore ? "text-foreground/30 cursor-not-allowed" : "btn-premium",
            )}
          >
            Next
          </button>
        </div>
      )}

      {viewing && (
        <MediaModal
          type={viewing.type}
          src={viewing.src}
          title={viewing.title}
          downloadHref={`/api/generations/${viewing.id}/download`}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}
