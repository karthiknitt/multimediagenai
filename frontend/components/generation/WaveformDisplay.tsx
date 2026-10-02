"use client";

import { Download, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface WaveformDisplayProps {
  audioUrl: string;
  title?: string;
}

export function WaveformDisplay({ audioUrl, title }: WaveformDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

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
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = title || "speech.wav";
    link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Waveform Visualization (Simple Progress Bar for Now) */}
      <div className="relative h-20 bg-muted rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center px-4">
          <div className="w-full h-12 flex items-center gap-0.5">
            {Array.from({ length: 50 }).map((_, i) => {
              const height = Math.random() * 100;
              const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
              const barProgress = (i / 50) * 100;
              const isActive = barProgress <= progress;

              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-colors ${
                    isActive ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Seek Slider */}
      <div className="space-y-1">
        <Slider
          value={currentTime}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <Button size="icon" variant="outline" onClick={togglePlay} className="h-10 w-10">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-1">
          <Button size="icon" variant="ghost" onClick={toggleMute} className="h-8 w-8">
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={isMuted ? 0 : volume}
            max={100}
            step={1}
            onValueChange={setVolume}
            className="w-24"
          />
        </div>

        {/* Download Button */}
        <Button size="icon" variant="outline" onClick={handleDownload} className="h-10 w-10">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
