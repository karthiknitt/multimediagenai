"use client";

import { Box, Download, Loader2, RefreshCw } from "lucide-react";
import { createElement, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModelViewerProps {
  /** Same-origin URL of a .glb (see /api/media/[generationId]). */
  src: string;
  alt: string;
  className?: string;
}

/**
 * Interactive 3D viewer (drag to rotate, scroll/pinch to zoom). Uses Google's
 * <model-viewer> web component, loaded on the client only (it touches `window`).
 * The refined mesh is geometry-only, so it is shown with neutral lighting.
 */
export function ModelViewer({ src, alt, className }: ModelViewerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return createElement("model-viewer", {
    src,
    alt,
    "camera-controls": true,
    "auto-rotate": true,
    "shadow-intensity": "1",
    exposure: "1.1",
    "touch-action": "pan-y",
    "interaction-prompt": "auto",
    style: { width: "100%", height: "100%", background: "transparent" },
    class: className,
  });
}

interface Model3DPreviewProps {
  generationId?: string | null;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export function Model3DPreview({ generationId, isLoading, onRegenerate }: Model3DPreviewProps) {
  if (!generationId) {
    return (
      <Card className="card-premium">
        <CardContent className="flex aspect-square max-h-[560px] w-full flex-col items-center justify-center gap-3 text-foreground/50">
          {isLoading ? (
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          ) : (
            <Box className="h-12 w-12" />
          )}
          <p className="text-sm">
            {isLoading ? "Building your 3D model..." : "Your 3D model will appear here"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="aspect-square max-h-[560px] w-full rounded-lg bg-gradient-to-b from-foreground/5 to-foreground/10">
          <ModelViewer
            src={`/api/media/${generationId}`}
            alt="Generated 3D model"
            className="h-full w-full"
          />
        </div>
        <p className="text-center text-xs text-foreground/50">
          Drag to rotate · scroll or pinch to zoom · geometry only (no texture)
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <a href={`/api/generations/${generationId}/download`} download>
              <Download className="mr-2 h-4 w-4" />
              Download GLB
            </a>
          </Button>
          {onRegenerate && (
            <Button type="button" variant="outline" onClick={onRegenerate} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
