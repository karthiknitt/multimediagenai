"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, type SelectOption } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Dice6, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParameterPanelProps {
  steps: number;
  onStepsChange: (value: number) => void;
  cfgScale: number;
  onCfgScaleChange: (value: number) => void;
  width: number;
  height: number;
  onResolutionChange: (width: number, height: number) => void;
  seed?: number;
  onSeedChange: (value: number | undefined) => void;
  negativePrompt?: string;
  onNegativePromptChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const resolutionOptions: SelectOption[] = [
  { value: "1024x1024", label: "1024 x 1024 (Square)", description: "1:1 aspect ratio" },
  { value: "1152x896", label: "1152 x 896 (Landscape)", description: "4:3 aspect ratio" },
  { value: "896x1152", label: "896 x 1152 (Portrait)", description: "3:4 aspect ratio" },
  { value: "1216x832", label: "1216 x 832 (Wide)", description: "3:2 aspect ratio" },
  { value: "832x1216", label: "832 x 1216 (Tall)", description: "2:3 aspect ratio" },
  { value: "1344x768", label: "1344 x 768 (Cinematic)", description: "16:9 aspect ratio" },
  { value: "768x1344", label: "768 x 1344 (Mobile)", description: "9:16 aspect ratio" },
  { value: "2048x2048", label: "2048 x 2048 (4K Square)", description: "High resolution" },
];

export function ParameterPanel({
  steps,
  onStepsChange,
  cfgScale,
  onCfgScaleChange,
  width,
  height,
  onResolutionChange,
  seed,
  onSeedChange,
  negativePrompt,
  onNegativePromptChange,
  disabled = false,
  className,
}: ParameterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seedLocked, setSeedLocked] = useState(false);

  const currentResolution = `${width}x${height}`;

  const handleResolutionChange = (value: string) => {
    const [w, h] = value.split("x").map(Number);
    onResolutionChange(w, h);
  };

  const handleRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 2147483647);
    onSeedChange(randomSeed);
  };

  const handleClearSeed = () => {
    onSeedChange(undefined);
    setSeedLocked(false);
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resolution */}
        <div className="space-y-2">
          <Label>Resolution</Label>
          <Select
            value={currentResolution}
            options={resolutionOptions}
            onChange={handleResolutionChange}
            disabled={disabled}
            label="Select resolution"
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Steps</Label>
            <span className="text-sm text-muted-foreground">{steps}</span>
          </div>
          <Slider
            value={steps}
            min={1}
            max={50}
            step={1}
            onValueChange={onStepsChange}
            disabled={disabled}
            showValue={false}
          />
          <p className="text-xs text-muted-foreground">
            More steps = higher quality but slower generation
          </p>
        </div>

        {/* CFG Scale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>CFG Scale</Label>
            <span className="text-sm text-muted-foreground">{cfgScale}</span>
          </div>
          <Slider
            value={cfgScale}
            min={1}
            max={20}
            step={0.5}
            onValueChange={onCfgScaleChange}
            disabled={disabled}
            showValue={false}
          />
          <p className="text-xs text-muted-foreground">
            How closely to follow the prompt (7-8 recommended)
          </p>
        </div>

        {/* Advanced toggle */}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          Advanced Options
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            {/* Seed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Seed</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSeedLocked(!seedLocked)}
                    disabled={disabled || !seed}
                    title={seedLocked ? "Unlock seed" : "Lock seed"}
                  >
                    {seedLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRandomSeed}
                    disabled={disabled}
                    title="Random seed"
                  >
                    <Dice6 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={seed ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSeedChange(val ? parseInt(val, 10) : undefined);
                  }}
                  placeholder="Random"
                  disabled={disabled || seedLocked}
                  className="flex-1"
                />
                {seed !== undefined && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearSeed}
                    disabled={disabled}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Use the same seed to reproduce results
              </p>
            </div>

            {/* Negative Prompt */}
            {onNegativePromptChange && (
              <div className="space-y-2">
                <Label>Negative Prompt</Label>
                <textarea
                  value={negativePrompt || ""}
                  onChange={(e) => onNegativePromptChange(e.target.value)}
                  placeholder="What to avoid in the image..."
                  disabled={disabled}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Describe what you don&apos;t want in the image
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
