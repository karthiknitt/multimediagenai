"use client";

import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Maximize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSecureImage } from "@/hooks/useSecureImage";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  generationId?: string | null;
  alt?: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function ImagePreview({
  generationId,
  alt = "Generated image",
  isLoading = false,
  onRegenerate,
  onDownload,
  className,
}: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch secure pre-signed URL for the image
  const { url: imageUrl, loading: imageLoading, error: imageError } = useSecureImage(generationId);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // Pre-signed URL already has authentication, can download directly
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generation-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onDownload?.();
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleCopyUrl = async () => {
    if (!imageUrl) return;

    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={!imageUrl || zoom <= 0.5}
                className="h-8 w-8"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                disabled={!imageUrl}
                className="h-8 px-2 text-xs"
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={!imageUrl || zoom >= 3}
                className="h-8 w-8"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {imageUrl && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyUrl}
                    className="h-8 w-8"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="h-8 w-8"
                    title="Fullscreen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    className="h-8 w-8"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              {onRegenerate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onRegenerate}
                  disabled={isLoading}
                  className="h-8 w-8"
                  title="Regenerate"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              )}
            </div>
          </div>

          {/* Image container */}
          <div className="relative flex min-h-96 items-center justify-center overflow-auto bg-muted/20 p-4">
            {isLoading || imageLoading ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="h-16 w-16 animate-pulse rounded-lg bg-muted" />
                <p className="text-sm">{isLoading ? "Generating..." : "Loading image..."}</p>
              </div>
            ) : imageError ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-red-500">
                  <ImageIcon className="h-12 w-12 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-red-600">Failed to load image</p>
                  <p className="text-sm">{imageError}</p>
                </div>
              </div>
            ) : imageUrl ? (
              <div
                className="transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={imageUrl}
                  alt={alt}
                  className="max-w-full rounded-lg shadow-lg"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed">
                  <ImageIcon className="h-12 w-12" />
                </div>
                <div className="text-center">
                  <p className="font-medium">No image yet</p>
                  <p className="text-sm">Enter a prompt and click Generate</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen modal */}
      {isFullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
          onClick={toggleFullscreen}
          onKeyDown={(e) => e.key === "Escape" && toggleFullscreen()}
          role="dialog"
          aria-modal="true"
          tabIndex={0}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="absolute right-4 top-4 z-10"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
          <img
            src={imageUrl}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
