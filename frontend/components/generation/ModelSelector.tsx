"use client";

import { cn } from "@/lib/utils";
import { Zap, Clock, Check } from "lucide-react";

interface ModelOption {
  id: string;
  name: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "ultra";
  estimatedTime: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  models: ModelOption[];
  disabled?: boolean;
  className?: string;
}

const speedColors = {
  fast: "text-green-400",
  medium: "text-yellow-400",
  slow: "text-orange-400",
};

const qualityBadges = {
  standard: "bg-foreground/10 text-foreground/80",
  high: "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30",
  ultra: "bg-linear-to-r from-cyan-500/20 to-magenta-500/20 text-transparent bg-clip-text gradient-text border border-cyan-400/30",
};

export function ModelSelector({
  value,
  onChange,
  models,
  disabled = false,
  className,
}: ModelSelectorProps) {
  return (
    <div className={cn("space-y-3", className)} role="radiogroup" aria-label="Model selection">
      <div className="grid gap-3">
        {models.map((model) => {
          const isSelected = value === model.id;
          return (
            <button
              key={model.id}
              type="button"
              role="radio"
              aria-checked={isSelected ? "true" : "false"}
              onClick={() => onChange(model.id)}
              disabled={disabled}
              className={cn(
                "relative flex items-start gap-4 rounded-xl p-4 text-left transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? "glass-strong border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                  : "glass hover-glow border border-foreground/10",
                disabled && "cursor-not-allowed opacity-50"
              )}
              aria-describedby={`model-${model.id}-description`}
            >
              {/* Selection indicator */}
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  isSelected
                    ? "border-cyan-400 bg-cyan-400/20"
                    : "border-foreground/30"
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-cyan-400" />}
              </div>

              {/* Model info */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold transition-colors",
                    isSelected ? "text-cyan-400" : "group-hover:text-cyan-400"
                  )}>{model.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold mono",
                      qualityBadges[model.quality]
                    )}
                  >
                    {model.quality.toUpperCase()}
                  </span>
                </div>
                <p id={`model-${model.id}-description`} className="text-sm text-foreground/60">{model.description}</p>
                <div className="flex items-center gap-4 text-xs mono font-semibold">
                  <span className={cn("flex items-center gap-1", speedColors[model.speed])}>
                    <Zap className="h-3 w-3" />
                    {model.speed.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-foreground/50">
                    <Clock className="h-3 w-3" />
                    ~{model.estimatedTime}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Default models for image generation
export const imageModels: ModelOption[] = [
  {
    id: "flux2-dev",
    name: "FLUX.2 Dev",
    description: "High-quality generation with excellent prompt following. Best for detailed, artistic images.",
    speed: "medium",
    quality: "ultra",
    estimatedTime: "20-30s",
  },
  {
    id: "flux2-schnell",
    name: "FLUX.2 Schnell",
    description: "Fast generation with good quality. Great for quick iterations and testing ideas.",
    speed: "fast",
    quality: "high",
    estimatedTime: "5-10s",
  },
];

// Default models for video generation
export const videoModels: ModelOption[] = [
  {
    id: "mochi",
    name: "Mochi 1",
    description: "Text-to-video generation. Creates smooth, natural motion from text descriptions.",
    speed: "slow",
    quality: "high",
    estimatedTime: "2-3 min",
  },
  {
    id: "cogvideox",
    name: "CogVideoX-5B",
    description: "Image-to-video generation. Animate your images with natural motion.",
    speed: "medium",
    quality: "high",
    estimatedTime: "1-2 min",
  },
];
