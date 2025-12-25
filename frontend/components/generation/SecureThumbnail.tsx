"use client";

import { useSecureImage } from "@/hooks/useSecureImage";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecureThumbnailProps {
  generationId: string;
  alt: string;
  className?: string;
}

export function SecureThumbnail({ generationId, alt, className }: SecureThumbnailProps) {
  const { url, loading, error } = useSecureImage(generationId);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={cn("flex items-center justify-center bg-cyan-500/10 rounded", className)}>
        <Sparkles className="h-5 w-5 text-cyan-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={cn("rounded object-cover", className)}
      loading="lazy"
    />
  );
}
