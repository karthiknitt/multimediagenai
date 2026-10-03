"use client";

import {
  Check,
  Copy,
  Download,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  Video as VideoIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSecureVideo } from "@/hooks/useSecureVideo";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  generationId?: string | null;
  alt?: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function VideoPreview({
  generationId,
  alt = "Generated video",
  isLoading = false,
  onRegenerate,
  onDownload,
  className,
}: VideoPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch secure pre-signed URL for the video
  const { url: videoUrl, loading: videoLoading, error: videoError } = useSecureVideo(generationId);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      // Pre-signed URL already has authentication, can download directly
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-generation-${Date.now()}.mp4`;
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
    if (!videoUrl) return;

    try {
      await navigator.clipboard.writeText(videoUrl);
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
              {videoUrl && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="h-8 w-8"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleMuteToggle}
                    className="h-8 w-8"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              {videoUrl && (
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

          {/* Video container */}
          <div className="relative flex min-h-96 items-center justify-center overflow-auto bg-muted/20 p-4">
            {isLoading || videoLoading ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="h-16 w-16 animate-pulse rounded-lg bg-muted" />
                <p className="text-sm">{isLoading ? "Generating video..." : "Loading video..."}</p>
              </div>
            ) : videoError ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-red-500">
                  <VideoIcon className="h-12 w-12 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-red-600">Failed to load video</p>
                  <p className="text-sm">{videoError}</p>
                </div>
              </div>
            ) : videoUrl ? (
              <div className="w-full max-w-4xl">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg shadow-lg"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  loop
                  playsInline
                >
                  <track kind="captions" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed">
                  <VideoIcon className="h-12 w-12" />
                </div>
                <div className="text-center">
                  <p className="font-medium">No video yet</p>
                  <p className="text-sm">Enter a prompt and click Generate</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen modal */}
      {isFullscreen && videoUrl && (
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
          <video
            src={videoUrl}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            loop
            playsInline
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </>
  );
}
