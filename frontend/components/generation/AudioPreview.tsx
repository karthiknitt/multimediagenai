"use client";

import {
  Check,
  Copy,
  Download,
  Music,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSecureVideo } from "@/hooks/useSecureVideo";
import { cn } from "@/lib/utils";

interface AudioPreviewProps {
  generationId?: string | null;
  alt?: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function AudioPreview({
  generationId,
  alt = "Generated audio",
  isLoading = false,
  onRegenerate,
  onDownload,
  className,
}: AudioPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch secure pre-signed URL for the audio (reusing video hook as it works for any media)
  const { url: audioUrl, loading: audioLoading, error: audioError } = useSecureVideo(generationId);

  // Update time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      handleSeek(newTime);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audio-generation-${Date.now()}.wav`;
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
    if (!audioUrl) return;

    try {
      await navigator.clipboard.writeText(audioUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-1">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Audio Player</span>
          </div>

          <div className="flex items-center gap-1">
            {audioUrl && (
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

        {/* Audio container */}
        <div className="relative flex min-h-64 flex-col items-center justify-center bg-muted/20 p-8">
          {isLoading || audioLoading ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="h-16 w-16 animate-pulse rounded-lg bg-muted" />
              <p className="text-sm">{isLoading ? "Generating audio..." : "Loading audio..."}</p>
            </div>
          ) : audioError ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-red-500">
                <Music className="h-12 w-12 text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-red-600">Failed to load audio</p>
                <p className="text-sm">{audioError}</p>
              </div>
            </div>
          ) : audioUrl ? (
            <div className="w-full max-w-2xl space-y-6">
              {/* Hidden audio element */}
              <audio ref={audioRef} src={audioUrl} preload="metadata" />

              {/* Visual waveform placeholder */}
              <div
                className="relative h-32 w-full rounded-lg bg-linear-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 p-4"
                role="img"
                aria-label="Audio waveform visualization"
              >
                <div className="flex h-full items-center justify-center gap-1">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const randomHeight = 30 + Math.random() * 70;
                    const randomDuration = 1 + Math.random();
                    return (
                      <div
                        key={i}
                        className="h-full w-1 rounded-full bg-linear-to-t from-cyan-500 to-purple-500 opacity-30"
                        style={{ height: `${randomHeight}%` }}
                        data-playing={isPlaying}
                        data-duration={randomDuration}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                    aria-label="Audio playback progress"
                    title={`Seek to ${formatTime(currentTime)}`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSkip(-10)}
                    className="h-10 w-10"
                    title="Rewind 10s"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    onClick={handlePlayPause}
                    className="h-14 w-14 rounded-full"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSkip(10)}
                    className="h-10 w-10"
                    title="Forward 10s"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                {/* Volume control */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleMuteToggle}
                    className="h-8 w-8"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-24 accent-cyan-500"
                    aria-label="Volume control"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed">
                <Music className="h-12 w-12" />
              </div>
              <div className="text-center">
                <p className="font-medium">No audio yet</p>
                <p className="text-sm">Enter a prompt and click Generate</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
