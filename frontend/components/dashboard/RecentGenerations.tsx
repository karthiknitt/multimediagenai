"use client";

import { ArrowRight, ExternalLink, Image, Loader2, Mic, Music, Video } from "lucide-react";
import Link from "next/link";
import { useGenerations } from "@/hooks/useGeneration";
import { formatDistanceToNow } from "@/lib/date-utils";
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
  speech: "text-blue-400",
};

const statusColors = {
  pending: "bg-yellow-400/80",
  processing: "bg-cyan-400/80",
  completed: "bg-green-400/80",
  failed: "bg-red-400/80",
};

// Helper to get generation variant label
function getVariantLabel(gen: any): string {
  if (gen.type === "video") {
    // Check if it's img2video or text2video based on sourceImageUrl
    return gen.sourceImageUrl ? "img2video" : "text2video";
  }
  if (gen.type === "audio") {
    return "Music";
  }
  if (gen.type === "speech") {
    return "Speech";
  }
  return gen.type;
}

export function RecentGenerations() {
  const { data, isLoading, error } = useGenerations(1, 5);

  if (isLoading) {
    return (
      <div className="card-premium">
        <div className="p-6 border-b border-foreground/10">
          <h2 className="text-2xl font-bold">Recent Generations</h2>
          <p className="text-foreground/60 mt-1">Your latest AI-generated content</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium">
        <div className="p-6 border-b border-foreground/10">
          <h2 className="text-2xl font-bold">Recent Generations</h2>
          <p className="text-foreground/60 mt-1">Your latest AI-generated content</p>
        </div>
        <div className="p-8">
          <p className="text-center text-sm text-red-400">Failed to load recent generations</p>
        </div>
      </div>
    );
  }

  const generations = data?.generations || [];

  return (
    <div className="card-premium">
      <div className="p-6 border-b border-foreground/10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recent Generations</h2>
          <p className="text-foreground/60 mt-1">Your latest AI-generated content</p>
        </div>
        <Link
          href="/gallery"
          className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-6">
        {generations.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="p-4 rounded-2xl bg-cyan-500/10">
                <Image className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
            <p className="text-foreground/60 mb-6">No generations yet. Start creating!</p>
            <Link href="/generate/image" className="btn-premium inline-flex items-center gap-2">
              Generate your first image
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {generations.map((gen) => {
              const Icon = typeIcons[gen.type as keyof typeof typeIcons] || Image;
              const iconColor = typeColors[gen.type as keyof typeof typeColors] || "text-cyan-400";
              const variantLabel = getVariantLabel(gen);
              const showThumbnail = gen.type === "image" && gen.outputUrl;

              return (
                <div
                  key={gen.id}
                  className="glass hover-glow group flex items-center gap-4 rounded-xl border border-foreground/10 p-4 transition-all"
                >
                  {/* Thumbnail - only show for images, use icons for video/audio */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-foreground/5 overflow-hidden">
                    {showThumbnail ? (
                      <img
                        src={gen.outputUrl}
                        alt={gen.prompt.slice(0, 50)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon className={cn("h-7 w-7", iconColor)} />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                      {gen.prompt}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-foreground/60 mono">
                      <span className="capitalize font-semibold">{variantLabel}</span>
                      <span className="text-foreground/30">•</span>
                      <span>{gen.model}</span>
                      <span className="text-foreground/30">•</span>
                      <span>{formatDistanceToNow(gen.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]",
                        statusColors[gen.status],
                      )}
                    />
                    <span className="text-xs capitalize text-foreground/60 font-semibold mono">
                      {gen.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
