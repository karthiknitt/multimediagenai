"use client";

import { Film, Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VideoThumbnailProps {
  /** Direct (pre-signed) URL of the video. */
  src?: string | null;
  /** Or a generation id, resolved to a pre-signed URL via /api/video/[id]. */
  generationId?: string | null;
  label?: string;
  className?: string;
}

/**
 * Small video preview: shows the first frame (the browser only fetches metadata + the first
 * frame, not the whole clip) and plays a muted loop while hovered or focused.
 */
export function VideoThumbnail({ src, generationId, label, className }: VideoThumbnailProps) {
  const [resolved, setResolved] = useState<string | null>(src ?? null);
  const [loading, setLoading] = useState(!src && !!generationId);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (src) {
      setResolved(src);
      return;
    }
    if (!generationId) return;

    let cancelled = false;
    setLoading(true);
    fetch(`/api/video/${generationId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { url: string }) => {
        if (!cancelled) setResolved(data.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src, generationId]);

  const start = () => {
    void videoRef.current?.play().catch(() => undefined);
  };
  const stop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0.1;
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center rounded bg-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (failed || !resolved) {
    return (
      <div className={cn("flex items-center justify-center rounded bg-magenta-500/10", className)}>
        <Film className="h-5 w-5 text-magenta-400" />
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded", className)}
      role="img"
      aria-label={label ?? "Video preview"}
      onMouseEnter={start}
      onMouseLeave={stop}
    >
      <video
        ref={videoRef}
        // #t=0.1 makes browsers render a frame as the poster without a full download
        src={`${resolved}#t=0.1`}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
      <span className="pointer-events-none absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60">
        <Play className="h-2.5 w-2.5 fill-white text-white" />
      </span>
    </div>
  );
}
