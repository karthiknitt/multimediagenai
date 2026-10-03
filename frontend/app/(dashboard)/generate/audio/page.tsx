"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, History, Mic, Music, Sparkles, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import type { z } from "zod";
import { AudioPreview } from "@/components/generation/AudioPreview";
import { GenerationCost } from "@/components/generation/GenerationCost";
import { GenerationLayout } from "@/components/generation/GenerationLayout";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { ParamControls } from "@/components/generation/ParamControls";
import { PromptInput } from "@/components/generation/PromptInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelGeneration, useGenerateAudio } from "@/hooks/useGeneration";
import { useGenerationStream } from "@/hooks/useGenerationStream";
import { formatDistanceToNow } from "@/lib/date-utils";
import { MUSIC_PARAMS, TTS_PARAMS } from "@/lib/model-params";
import { audioGenerationSchema } from "@/lib/validation";
import { type AudioParams, useGenerationStore } from "@/store/generation-store";

// Define form data type
type FormData = z.input<typeof audioGenerationSchema>;

// Voice preset options
const VOICE_PRESETS = [
  { id: "ryan", label: "Ryan - dynamic male (English)", language: "en" },
  { id: "aiden", label: "Aiden - sunny American male (English)", language: "en" },
  { id: "vivian", label: "Vivian - bright young female (Chinese)", language: "zh" },
  { id: "serena", label: "Serena - warm gentle female (Chinese)", language: "zh" },
  { id: "uncle_fu", label: "Uncle Fu - mellow male (Chinese)", language: "zh" },
  { id: "dylan", label: "Dylan - Beijing male (Chinese)", language: "zh" },
  { id: "eric", label: "Eric - Chengdu male (Chinese)", language: "zh" },
  { id: "ono_anna", label: "Ono Anna - playful female (Japanese)", language: "ja" },
  { id: "sohee", label: "Sohee - warm female (Korean)", language: "ko" },
  { id: "custom", label: "Custom Voice URL (clone)", language: "en" },
] as const;

export default function AudioGenerationPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [variant, setVariant] = useState<"music" | "tts">("music");

  const { audioParams, setAudioParams, history, addJob, updateJob } = useGenerationStore();

  const generateMutation = useGenerateAudio();
  const cancelMutation = useCancelGeneration();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(audioGenerationSchema),
    defaultValues: { ...audioParams, voicePreset: audioParams.voicePreset || "ryan" },
  });

  const prompt = watch("prompt") ?? "";
  const text = watch("text") ?? "";
  const voicePreset = watch("voicePreset") ?? "ryan";
  const voiceReferenceUrl = watch("voiceReferenceUrl");
  const values = watch();
  const setParams = (patch: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(patch)) {
      setValue(key as keyof FormData, value as never, { shouldDirty: true });
    }
  };

  // Update parameters when variant changes
  useEffect(() => {
    setValue("variant", variant);
  }, [variant, setValue]);

  // SSE stream for progress updates
  const { lastEvent, isConnected } = useGenerationStream(activeJobId, {
    onProgress: (event) => {
      console.log("Progress event:", event);
    },
    onComplete: (event) => {
      console.log("Complete event:", event);
      setCompletedJobId(activeJobId);
      setActiveJobId(null);
    },
    onError: (event) => {
      console.error("Error event:", event);
      setActiveJobId(null);
    },
  });

  const currentProgress = lastEvent?.progress ?? 0;
  const currentStatus =
    lastEvent?.type === "failed"
      ? "failed"
      : lastEvent?.type === "completed"
        ? "completed"
        : lastEvent?.type === "progress" && lastEvent.progress && lastEvent.progress > 0
          ? "processing"
          : activeJobId
            ? "pending"
            : "pending";

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      // Validate variant-specific requirements
      if (data.variant === "music" && !data.prompt) {
        alert("Please provide a prompt for music generation");
        return;
      }
      if (data.variant === "tts" && !data.text) {
        alert("Please provide text for speech generation");
        return;
      }

      // Save params to store, then start generation
      setAudioParams({
        ...data,
        prompt: data.prompt ?? "",
        language: data.language ?? "en",
      });
      const result = await generateMutation.mutateAsync(data);

      // Track the job
      const jobId = result.jobId;
      setActiveJobId(jobId);
      setCompletedJobId(null);

      addJob({
        id: jobId,
        type: "audio",
        status: "pending",
        progress: 0,
        prompt: data.variant === "music" ? data.prompt! : data.text!,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Generation failed:", error);
    }
  };

  const handleCancel = useCallback(() => {
    if (activeJobId) {
      cancelMutation.mutate(activeJobId);
      updateJob(activeJobId, { status: "failed", error: "Cancelled by user" });
      setActiveJobId(null);
    }
  }, [activeJobId, cancelMutation, updateJob]);

  const handleRegenerate = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const handleHistoryItemClick = (item: (typeof history)[0]) => {
    if (variant === "music") {
      setValue("prompt", item.prompt);
    } else {
      setValue("text", item.prompt);
    }
    // Set the completed job ID to display the historical audio
    if (item.id) {
      setCompletedJobId(item.id);
    }
  };

  const isGenerating = generateMutation.isPending || !!activeJobId;

  // Keyboard shortcuts for form submission
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit form
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const hasContent = variant === "music" ? prompt.trim() : text.trim();
        if (!isGenerating && hasContent) {
          handleSubmit(onSubmit)();
        }
      }
      // Escape to cancel generation
      if (e.key === "Escape" && isGenerating) {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGenerating, prompt, text, variant, handleSubmit, onSubmit, handleCancel]);

  // Sidebar with parameters
  const sidebar = (
    <div className="space-y-6">
      <div
        className="card-premium p-6"
        style={{ pointerEvents: "auto", position: "relative", zIndex: 1 }}
      >
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
          Mode
        </h3>
        <Tabs value={variant} onValueChange={(v) => setVariant(v as "music" | "tts")}>
          <TabsList
            className="grid w-full grid-cols-2 border-2 border-cyan-500/30"
            style={{ position: "relative", zIndex: 10 }}
          >
            <TabsTrigger value="music" className="flex items-center gap-2" type="button">
              <Music className="h-4 w-4" />
              Music
            </TabsTrigger>
            <TabsTrigger value="tts" className="flex items-center gap-2" type="button">
              <Mic className="h-4 w-4" />
              Speech
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="mt-2 text-xs text-foreground/60">
          {variant === "music"
            ? "Generate music from text description using ACE-Step 1.5"
            : "Convert text to speech using Qwen3-TTS with voice cloning"}
        </p>
      </div>

      <div className="card-premium p-6 space-y-6">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
          Parameters
        </h3>

        {variant === "music" ? (
          <ParamControls
            defs={MUSIC_PARAMS}
            values={values}
            onChange={setParams}
            disabled={isGenerating}
          />
        ) : (
          <>
            {/* Voice Preset */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Voice Preset</Label>
              <Select
                value={voicePreset}
                onValueChange={(value) => {
                  setValue("voicePreset", value as typeof voicePreset);
                  const preset = VOICE_PRESETS.find((p) => p.id === value);
                  if (preset && value !== "custom") {
                    setValue("language", preset.language);
                  }
                }}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-foreground/50">
                Choose a voice or provide custom reference
              </p>
            </div>

            {/* Custom Voice URL (only if "custom" selected) */}
            {voicePreset === "custom" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Voice Reference URL</Label>
                <Input
                  type="url"
                  value={voiceReferenceUrl ?? ""}
                  onChange={(e) => setValue("voiceReferenceUrl", e.target.value || undefined)}
                  placeholder="https://example.com/voice.wav"
                  disabled={isGenerating}
                />
                <p className="text-xs text-foreground/50">
                  Provide a clean 3-10s voice clip (WAV/MP3) for voice cloning
                </p>
              </div>
            )}

            <ParamControls
              defs={TTS_PARAMS}
              values={values}
              onChange={setParams}
              disabled={isGenerating}
            />
          </>
        )}
      </div>
    </div>
  );

  // History sidebar
  const historyPanel = (
    <div className="card-premium">
      <div className="p-6 border-b border-foreground/10">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-cyan-400" />
          Recent
        </h3>
      </div>
      <div className="p-4">
        {history.filter((h) => h.type === "audio").length === 0 ? (
          <p className="text-center text-sm text-foreground/60 py-8">No recent generations</p>
        ) : (
          <div className="space-y-2">
            {history
              .filter((h) => h.type === "audio")
              .slice(0, 10)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleHistoryItemClick(item)}
                  className="flex w-full items-start gap-3 rounded-lg glass hover-glow border border-foreground/10 p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Load prompt: ${item.prompt.slice(0, 50)}${item.prompt.length > 50 ? "..." : ""}`}
                >
                  {item.id ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-cyan-500/10">
                      <Volume2 className="h-5 w-5 text-cyan-400" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-cyan-500/10">
                      <Music className="h-5 w-5 text-cyan-400" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="line-clamp-2 text-xs font-semibold">{item.prompt}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/50 mono">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(item.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl sm:text-5xl font-bold mb-2">
          <span className="gradient-text">Audio Generation</span>
        </h1>
        <p className="text-foreground/60 text-lg">Create music or speech from text with AI</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} aria-label="Audio generation form">
        <GenerationLayout sidebar={sidebar} history={historyPanel}>
          <div className="space-y-6" role="main">
            {/* Prompt input */}
            <div className="card-premium p-6">
              <PromptInput
                value={variant === "music" ? prompt : text}
                onChange={(value) => setValue(variant === "music" ? "prompt" : "text", value)}
                disabled={isGenerating}
                maxLength={variant === "music" ? 2000 : 500}
                autoFocus={true}
                placeholder={
                  variant === "music"
                    ? "Upbeat electronic dance music with a catchy melody and driving beat..."
                    : "Enter the text you want to convert to speech (max 500 characters)..."
                }
              />
              {variant === "music" && errors.prompt && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {errors.prompt.message}
                </p>
              )}
              {variant === "tts" && errors.text && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {errors.text.message}
                </p>
              )}
            </div>

            {/* Generate button */}
            <div className="space-y-2">
              <button
                type="submit"
                className="btn-premium w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                disabled={isGenerating || (variant === "music" ? !prompt.trim() : !text.trim())}
                aria-label={
                  isGenerating ? "Generating audio, please wait" : "Generate audio from prompt"
                }
                aria-live="polite"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {isGenerating
                    ? "Generating..."
                    : `Generate ${variant === "music" ? "Music" : "Speech"}`}
                </span>
              </button>
              {!isGenerating && (
                <p className="text-center text-xs text-foreground/50 mono">
                  Tip: Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 border border-foreground/20">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 border border-foreground/20">
                    Enter
                  </kbd>{" "}
                  to generate
                  {variant === "music"
                    ? " • ~15-30s generation time"
                    : " • ~10-20s generation time"}
                </p>
              )}
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <GenerationProgress
                  status={currentStatus as "pending" | "processing" | "completed" | "failed"}
                  progress={currentProgress}
                  message={lastEvent?.message}
                  onCancel={handleCancel}
                  error={lastEvent?.error}
                />
                {activeJobId && (
                  <div className="flex items-center justify-center gap-2 text-xs text-foreground/50 mono">
                    <div
                      className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                    />
                    <span>{isConnected ? "Connected to server" : "Connecting..."}</span>
                    {lastEvent && <span>• Last update: {lastEvent.type}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            <AudioPreview
              generationId={completedJobId}
              isLoading={isGenerating}
              onRegenerate={completedJobId ? handleRegenerate : undefined}
            />
            <GenerationCost generationId={completedJobId} />
          </div>
        </GenerationLayout>
      </form>
    </div>
  );
}
